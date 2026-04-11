import json
import sys
from math import sqrt


def mae(y_true, y_pred):
    n = min(len(y_true), len(y_pred))
    if n <= 0:
        return None
    return sum(abs(y_true[i] - y_pred[i]) for i in range(n)) / n


def rmse(y_true, y_pred):
    n = min(len(y_true), len(y_pred))
    if n <= 0:
        return None
    return sqrt(sum((y_true[i] - y_pred[i]) ** 2 for i in range(n)) / n)


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw or "{}")
    history = payload.get("history") or []
    horizon_days = int(payload.get("horizonDays") or 30)
    horizon_days = horizon_days if horizon_days in (7, 15, 30) else 30

    if len(history) < 60:
        raise ValueError("Need at least ~60 daily points for Prophet.")

    try:
        import pandas as pd
        from prophet import Prophet
    except Exception as e:
        # Print for Node to surface a useful error message
        raise e

    df = pd.DataFrame(history)
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"] = pd.to_numeric(df["y"])
    df = df.sort_values("ds")

    # Simple accuracy: hold out last 30 days (or 20% if smaller), forecast and score.
    holdout = min(30, max(7, int(len(df) * 0.2)))
    holdout = min(holdout, len(df) - 10)
    accuracy = None

    if holdout >= 7:
        train = df.iloc[:-holdout].copy()
        test = df.iloc[-holdout:].copy()

        m = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.8,
        )
        m.fit(train)
        future_test = m.make_future_dataframe(periods=holdout, freq="D", include_history=False)
        pred_test = m.predict(future_test)
        y_true = test["y"].tolist()
        y_pred = pred_test["yhat"].tolist()
        accuracy = {
            "holdoutDays": int(holdout),
            "MAE": round(mae(y_true, y_pred), 2) if mae(y_true, y_pred) is not None else None,
            "RMSE": round(rmse(y_true, y_pred), 2) if rmse(y_true, y_pred) is not None else None,
        }

    # Final model on full history, forecast horizon_days ahead.
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        interval_width=0.8,
    )
    model.fit(df)
    future = model.make_future_dataframe(periods=horizon_days, freq="D", include_history=False)
    forecast = model.predict(future)

    out_rows = []
    for _, r in forecast.iterrows():
        ds = r["ds"].strftime("%Y-%m-%d")
        out_rows.append(
            {
                "ds": ds,
                "yhat": float(r["yhat"]),
                "yhat_lower": float(r["yhat_lower"]),
                "yhat_upper": float(r["yhat_upper"]),
            }
        )

    sys.stdout.write(json.dumps({"forecast": out_rows, "accuracy": accuracy}))


if __name__ == "__main__":
    main()

