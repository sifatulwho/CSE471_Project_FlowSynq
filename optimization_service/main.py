from typing import List, Optional, Dict, Any
import threading

from fastapi import FastAPI
from pydantic import BaseModel, Field

try:
    from scipy.optimize import linprog
except Exception:  # pragma: no cover
    linprog = None

# ── TinyLlama lazy loader ────────────────────────────────────────────────────
_llm_pipeline = None
_llm_lock = threading.Lock()
_llm_failed = False

def _get_llm():
    global _llm_pipeline, _llm_failed
    if _llm_failed:
        return None
    if _llm_pipeline is not None:
        return _llm_pipeline
    with _llm_lock:
        if _llm_pipeline is not None:
            return _llm_pipeline
        try:
            from transformers import pipeline as hf_pipeline
            _llm_pipeline = hf_pipeline(
                "text-generation",
                model="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
                max_new_tokens=300,
                temperature=0.7,
                do_sample=True,
                pad_token_id=2,
            )
            print("[TinyLlama] Model loaded successfully.")
        except Exception as e:
            print(f"[TinyLlama] Failed to load model: {e}")
            _llm_failed = True
            _llm_pipeline = None
        return _llm_pipeline

app = FastAPI(title="FlowSync AI Service")


class ShipmentInput(BaseModel):
    shipmentId: str
    shipName: str
    arrivalTime: str
    cargoQuantity: float
    gasType: str = "Other"
    portName: str
    weatherRiskScore: float = 0
    marineRiskScore: float = 0


class DockInput(BaseModel):
    dockId: str
    dockName: str
    portName: str
    dockCapacity: float
    currentOccupiedCapacity: float = 0
    dockVacancy: float = 0
    supportedGasTypes: List[str] = Field(default_factory=list)
    averageHandlingTime: float = 0
    distanceToTank: float = 0
    status: str = "active"


class TankInput(BaseModel):
    tankId: str
    tankName: str
    gasType: str
    location: str
    capacity: float
    currentLevel: float


class DockOptimizationRequest(BaseModel):
    shipment: ShipmentInput
    docks: List[DockInput]
    tanks: List[TankInput] = Field(default_factory=list)


def _safe_div(num: float, den: float) -> float:
    return num / den if den else 0.0


def _dock_cost(shipment: ShipmentInput, dock: DockInput) -> float:
    quantity = max(shipment.cargoQuantity, 1.0)
    congestion_ratio = _safe_div(dock.currentOccupiedCapacity, max(dock.dockCapacity, 1.0))
    transport_cost = dock.distanceToTank * quantity * 0.35
    handling_cost = dock.averageHandlingTime * 12.0
    congestion_penalty = congestion_ratio * 100.0
    weather_penalty = max(0.0, shipment.weatherRiskScore * 1.4)
    marine_penalty = max(0.0, shipment.marineRiskScore * 1.1)
    return transport_cost + handling_cost + congestion_penalty + weather_penalty + marine_penalty


def _is_feasible(shipment: ShipmentInput, dock: DockInput) -> bool:
    same_port = dock.portName.strip().lower() == shipment.portName.strip().lower()
    enough_vacancy = dock.dockVacancy > 0
    supports_type = shipment.gasType in dock.supportedGasTypes
    not_overloaded = dock.currentOccupiedCapacity + 1 <= dock.dockCapacity
    is_active = dock.status == "active"
    return same_port and enough_vacancy and supports_type and not_overloaded and is_active


def _deterministic_score(shipment: ShipmentInput, dock: DockInput) -> float:
    capacity_score = max(0.0, min(25.0, (dock.dockVacancy / max(dock.dockCapacity, 1.0)) * 25.0))
    compatibility_score = 25.0 if shipment.gasType in dock.supportedGasTypes else 0.0
    distance_score = max(0.0, 20.0 - dock.distanceToTank * 2.5)
    time_score = max(0.0, 15.0 - dock.averageHandlingTime * 1.5)
    congestion_ratio = _safe_div(dock.currentOccupiedCapacity, max(dock.dockCapacity, 1.0))
    cost_score = max(0.0, 15.0 - congestion_ratio * 15.0)
    return max(0.0, min(100.0, capacity_score + compatibility_score + distance_score + time_score + cost_score))


@app.post("/optimize/dock-assignment")
def optimize_dock_assignment(payload: DockOptimizationRequest):
    shipment = payload.shipment
    docks = payload.docks
    warnings: List[str] = []

    if not docks:
        return {
            "recommendedDock": None,
            "dockId": None,
            "score": 0,
            "estimatedCostSaving": 0,
            "estimatedTimeSavingHours": 0,
            "reason": "No docks available for optimization.",
            "warnings": ["No docks were provided."],
        }

    feasible_docks = [dock for dock in docks if _is_feasible(shipment, dock)]
    candidate_docks = feasible_docks
    if not candidate_docks:
        candidate_docks = docks
        warnings.append("No dock fully satisfies all constraints. Returning best fallback recommendation.")

    costs = [_dock_cost(shipment, dock) for dock in candidate_docks]

    chosen_idx = 0
    if linprog is not None and costs:
        # LP setup:
        # Minimize c.x where x is a one-hot-like assignment vector over docks.
        # sum(x_i) = 1 ensures one dock is chosen.
        # 0 <= x_i <= 1 bounds each candidate variable.
        n = len(costs)
        c = costs
        a_eq = [[1.0] * n]
        b_eq = [1.0]
        bounds = [(0.0, 1.0)] * n
        result = linprog(c=c, A_eq=a_eq, b_eq=b_eq, bounds=bounds, method="highs")
        if result.success and result.x is not None:
            chosen_idx = int(max(range(n), key=lambda i: result.x[i]))
        else:
            warnings.append("LP solver failed; deterministic fallback scoring applied.")
            chosen_idx = int(min(range(len(costs)), key=lambda i: costs[i]))
    else:
        warnings.append("scipy.optimize.linprog unavailable; deterministic fallback scoring applied.")
        scored = [_deterministic_score(shipment, dock) for dock in candidate_docks]
        chosen_idx = int(max(range(len(scored)), key=lambda i: scored[i]))

    selected = candidate_docks[chosen_idx]
    selected_cost = costs[chosen_idx]
    max_cost = max(costs) if costs else selected_cost
    score = max(0.0, min(100.0, 100.0 - _safe_div(selected_cost, max(max_cost, 1.0)) * 100.0))

    estimated_cost_saving = round(max(0.0, max_cost - selected_cost), 2)
    estimated_time_saving = round(max(0.0, 8.0 - selected.averageHandlingTime), 2)

    reason = (
        f"{selected.dockName} is recommended because it minimizes combined distance, handling time, "
        f"transport cost, and congestion penalty while remaining as constraint-compliant as possible."
    )

    return {
        "recommendedDock": selected.dockName,
        "dockId": selected.dockId,
        "score": round(score, 2),
        "estimatedCostSaving": estimated_cost_saving,
        "estimatedTimeSavingHours": estimated_time_saving,
        "reason": reason,
        "warnings": warnings,
    }


# ════════════════════════════════════════════════════════════════════
#  Supply Planning Endpoints
# ════════════════════════════════════════════════════════════════════

class AllocationItem(BaseModel):
    product: str = ""
    quantity: float = 0
    destinationBerth: str = ""
    priority: str = "medium"
    estimatedCost: float = 0
    reason: str = ""

class ShipmentPriorityItem(BaseModel):
    shipName: str = ""
    commodity: str = ""
    quantity: float = 0
    assignedDock: str = ""
    priorityLevel: int = 5
    reason: str = ""
    priorityScore: float = 0

class PlanMetrics(BaseModel):
    totalAllocation: float = 0
    demandCoveragePercentage: float = 0
    inventoryUtilization: float = 0
    estimatedCost: float = 0
    shortageAmount: float = 0
    highPriorityShipments: int = 0
    planEfficiencyScore: float = 0

class PlanExplanationRequest(BaseModel):
    planDate: str = ""
    portName: str = ""
    strategy: str = "balanced"
    metrics: PlanMetrics = Field(default_factory=PlanMetrics)
    allocations: List[AllocationItem] = Field(default_factory=list)
    shipmentPriorities: List[ShipmentPriorityItem] = Field(default_factory=list)


def _deterministic_explanation(req: PlanExplanationRequest) -> dict:
    """Fallback: builds explanations from the plan data without an LLM."""
    m = req.metrics
    top_alloc = req.allocations[0] if req.allocations else None
    top_ship = req.shipmentPriorities[0] if req.shipmentPriorities else None

    plan_summary = (
        f"The daily supply plan for {req.planDate} at {req.portName} covers "
        f"{m.demandCoveragePercentage:.1f}% of forecasted demand, "
        f"allocating {m.totalAllocation:.0f} total units across "
        f"{len(req.allocations)} commodity line(s). "
        f"Estimated cost: ${m.estimatedCost:.2f}. "
        f"Plan efficiency score: {m.planEfficiencyScore:.1f}/100."
    )

    alloc_explanation = (
        f"Highest-priority allocation: {top_alloc.product} → {top_alloc.destinationBerth} "
        f"({top_alloc.quantity:.0f} units, {top_alloc.priority} priority). "
        f"Reason: {top_alloc.reason}"
    ) if top_alloc else "No allocations generated."

    ship_explanation = (
        f"{top_ship.shipName} carrying {top_ship.commodity} ({top_ship.quantity:.0f} units) "
        f"is ranked #1 for unloading with a priority score of {top_ship.priorityScore:.1f}. "
        f"Reason: {top_ship.reason}"
    ) if top_ship else "No shipment priorities generated."

    recommendations = (
        "Demand coverage is below 80%. Consider scheduling additional shipments or "
        "increasing allocation quantities to reduce shortage risk."
        if m.demandCoveragePercentage < 80 else
        "Good demand coverage achieved. Consider optimising dock turnover times to "
        "further improve the efficiency score."
    )

    return {
        "planSummary": plan_summary,
        "allocationExplanation": alloc_explanation,
        "shipmentPriorityExplanation": ship_explanation,
        "improvementRecommendations": recommendations,
        "fallbackUsed": True,
    }


def _build_llm_prompt(req: PlanExplanationRequest) -> str:
    alloc_lines = "\n".join(
        f"  - {a.product}: {a.quantity:.0f} units to {a.destinationBerth} ({a.priority} priority)"
        for a in req.allocations[:5]
    )
    ship_lines = "\n".join(
        f"  {i+1}. {s.shipName} ({s.commodity}, {s.quantity:.0f} units) — score {s.priorityScore:.1f}"
        for i, s in enumerate(req.shipmentPriorities[:5])
    )
    m = req.metrics
    return (
        f"<|system|>You are a port logistics expert. Write concise, professional, operator-friendly explanations.</s>"
        f"<|user|>Generate a supply plan report for {req.portName} on {req.planDate}.\n\n"
        f"Metrics: demand coverage {m.demandCoveragePercentage:.1f}%, "
        f"efficiency {m.planEfficiencyScore:.1f}/100, "
        f"estimated cost ${m.estimatedCost:.2f}, "
        f"shortage {m.shortageAmount:.0f} units.\n\n"
        f"Allocations:\n{alloc_lines}\n\n"
        f"Shipment unloading priority:\n{ship_lines}\n\n"
        f"Provide: 1) Plan Summary 2) Allocation Explanation 3) Shipment Priority Explanation "
        f"4) Improvement Recommendations. Be concise.</s>\n<|assistant|>"
    )


@app.post("/ai/generate-plan-explanation")
def generate_plan_explanation(req: PlanExplanationRequest):
    """
    Use TinyLlama to generate human-readable supply plan explanations.
    Falls back to deterministic text if the model is unavailable.
    """
    llm = _get_llm()
    if llm is None:
        result = _deterministic_explanation(req)
        result["fallbackUsed"] = True
        return result

    try:
        prompt = _build_llm_prompt(req)
        output = llm(prompt, max_new_tokens=350, do_sample=True, temperature=0.7)
        raw_text = output[0]["generated_text"] if output else ""

        # Strip the prompt from the output
        if "<|assistant|>" in raw_text:
            raw_text = raw_text.split("<|assistant|>")[-1].strip()

        # Parse sections from LLM output
        sections = {
            "planSummary": "",
            "allocationExplanation": "",
            "shipmentPriorityExplanation": "",
            "improvementRecommendations": "",
        }

        lines = raw_text.strip().split("\n")
        current_key = "planSummary"
        key_map = {
            "1)": "planSummary", "1.": "planSummary",
            "plan summary": "planSummary",
            "2)": "allocationExplanation", "2.": "allocationExplanation",
            "allocation": "allocationExplanation",
            "3)": "shipmentPriorityExplanation", "3.": "shipmentPriorityExplanation",
            "shipment priority": "shipmentPriorityExplanation",
            "4)": "improvementRecommendations", "4.": "improvementRecommendations",
            "improvement": "improvementRecommendations",
            "recommendation": "improvementRecommendations",
        }

        for line in lines:
            lower = line.lower().strip()
            matched = False
            for marker, key in key_map.items():
                if lower.startswith(marker) or marker in lower[:30]:
                    current_key = key
                    sections[current_key] += line.strip() + " "
                    matched = True
                    break
            if not matched and line.strip():
                sections[current_key] += line.strip() + " "

        # Ensure all sections have content
        fallback = _deterministic_explanation(req)
        for key in sections:
            if not sections[key].strip():
                sections[key] = fallback[key]

        return {**sections, "fallbackUsed": False}

    except Exception as e:
        print(f"[TinyLlama] Inference error: {e}")
        result = _deterministic_explanation(req)
        result["fallbackUsed"] = True
        return result
