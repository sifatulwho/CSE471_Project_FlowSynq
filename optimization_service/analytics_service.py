from typing import Any, Dict, List

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="FlowSynq Analytics Recommendation Service")


class AnalyticsPayload(BaseModel):
    filters: Dict[str, Any] = Field(default_factory=dict)
    kpis: Dict[str, float] = Field(default_factory=dict)
    costBreakdown: Dict[str, float] = Field(default_factory=dict)
    optimizationSavings: float = 0
    trends: List[Dict[str, Any]] = Field(default_factory=list)
    inefficiencies: List[Dict[str, Any]] = Field(default_factory=list)


def _append(issues: List[Dict[str, Any]], recs: List[Dict[str, Any]], problem: str, detail: str, recommendation: str, saving: float):
    issues.append({"title": problem, "detail": detail, "severity": "high"})
    recs.append({
        "problem": problem,
        "recommendation": recommendation,
        "expectedSaving": round(float(max(0, saving)), 2),
    })


@app.post("/analytics/recommendations")
def analytics_recommendations(payload: AnalyticsPayload):
    kpis = payload.kpis or {}
    costs = payload.costBreakdown or {}

    avg_cost = float(kpis.get("avgCostPerShipment", 0))
    fulfillment = float(kpis.get("fulfillmentRate", 0))
    utilization = float(kpis.get("storageUtilization", 0))
    delay_cost = float(kpis.get("delayCost", 0))
    transport_cost = float(costs.get("transport", 0))
    storage_cost = float(costs.get("storage", 0))
    handling_cost = float(costs.get("handling", 0))

    inefficiencies: List[Dict[str, Any]] = list(payload.inefficiencies or [])
    recommendations: List[Dict[str, Any]] = []

    if avg_cost > 700:
        _append(
            inefficiencies,
            recommendations,
            "High Transport Cost",
            f"Average shipment cost is {avg_cost:.0f}, above operational benchmark.",
            "Use optimized dock assignment and shorter route clustering for high-cost shipments.",
            transport_cost * 0.06,
        )

    if utilization > 90:
        _append(
            inefficiencies,
            recommendations,
            "Storage Congestion",
            f"Storage utilization is {utilization:.1f}%, signaling potential bottlenecks.",
            "Rebalance tank loading and increase outbound dispatch frequency.",
            storage_cost * 0.1,
        )
    elif utilization < 45:
        _append(
            inefficiencies,
            recommendations,
            "Idle Dock/Tank Capacity",
            f"Storage utilization is low at {utilization:.1f}%.",
            "Consolidate operations to fewer docks and improve berth scheduling.",
            handling_cost * 0.08,
        )

    if fulfillment < 85:
        _append(
            inefficiencies,
            recommendations,
            "Low Supply Fulfillment",
            f"Fulfillment rate dropped to {fulfillment:.1f}%.",
            "Increase supply planning buffers and prioritize delayed demand lanes.",
            max(600.0, delay_cost * 0.15),
        )

    if delay_cost > max(1.0, transport_cost * 0.2):
        _append(
            inefficiencies,
            recommendations,
            "Excess Delivery Delay Cost",
            f"Delay cost is {delay_cost:.0f}, disproportionate versus transport cost.",
            "Apply proactive delay mitigation and route-by-risk scheduling.",
            delay_cost * 0.2,
        )

    if payload.optimizationSavings > 0:
        recommendations.append({
            "problem": "Existing Dock Optimization Opportunity",
            "recommendation": "Increase adoption of suggested docks in shipment execution.",
            "expectedSaving": round(float(payload.optimizationSavings), 2),
        })

    if not recommendations:
        recommendations.append({
            "problem": "No major inefficiency detected",
            "recommendation": "Maintain current plan and monitor trends weekly.",
            "expectedSaving": 0,
        })

    efficiency_score = 100.0
    efficiency_score -= min(30.0, delay_cost / 500.0)
    efficiency_score -= min(25.0, max(0.0, avg_cost - 500.0) / 20.0)
    efficiency_score += min(20.0, fulfillment / 5.0)
    efficiency_score -= min(15.0, abs(utilization - 75.0) / 2.0)
    efficiency_score = max(0.0, min(100.0, efficiency_score))

    return {
        "inefficiencies": inefficiencies,
        "recommendations": recommendations,
        "score": round(efficiency_score, 2),
    }


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
