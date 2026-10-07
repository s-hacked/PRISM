from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"


# ---------------------------------
# Create API
# ---------------------------------

app = FastAPI(
    title="PRISM ML Service",
    description="Churn prediction service for PRISM",
    version="1.0.0"
)


# ---------------------------------
# Load trained model
# ---------------------------------

MODEL_PATH = "models/churn/final_ebm.pkl"
PREPROCESSOR_PATH = "models/churn/preprocessor.pkl"

model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)
SALES_MODEL_PATH = "models/sales/prism_sales_forecasting_model.joblib"

sales_model = joblib.load(SALES_MODEL_PATH)

print("PRISM sales forecasting model loaded successfully!")

print("PRISM churn model loaded successfully!")


# ---------------------------------
# Customer input structure
# ---------------------------------

class Customer(BaseModel):
    gender: str
    SeniorCitizen: int
    Partner: str
    Dependents: str
    tenure: int
    PhoneService: str
    MultipleLines: str
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str
    Contract: str
    PaperlessBilling: str
    PaymentMethod: str
    MonthlyCharges: float
    TotalCharges: float


# ---------------------------------
# Health check
# ---------------------------------

@app.get("/")
def root():
    return {
        "service": "PRISM ML Service",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "EBM Churn Model"
    }


# ---------------------------------
# Churn prediction
# ---------------------------------

@app.post("/predict/churn")
def predict_churn(customer: Customer):

    # Convert request into DataFrame
    df = pd.DataFrame([customer.model_dump()])

    # ---------------------------------
    # Feature engineering
    # Same logic used during training
    # ---------------------------------

    # NewCustomer
    df["NewCustomer"] = (
        df["tenure"] <= 6
    ).astype(int)

    # TenureGroup
    df["TenureGroup"] = pd.cut(
        df["tenure"],
        bins=[-1, 6, 12, 24, 48, 72],
        labels=[
            "0-6 months",
            "7-12 months",
            "13-24 months",
            "25-48 months",
            "49-72 months"
        ]
    )

    # IsMonthToMonth
    df["IsMonthToMonth"] = (
        df["Contract"] == "Month-to-month"
    ).astype(int)

    # HouseholdSize
    df["HouseholdSize"] = (
        1
        + (df["Partner"] == "Yes").astype(int)
        + (df["Dependents"] == "Yes").astype(int)
    )

    # ServiceCount
    service_columns = [
        "PhoneService",
        "MultipleLines",
        "OnlineSecurity",
        "OnlineBackup",
        "DeviceProtection",
        "TechSupport",
        "StreamingTV",
        "StreamingMovies"
    ]

    df["ServiceCount"] = 0

    for col in service_columns:
        df["ServiceCount"] += (
            df[col] == "Yes"
        ).astype(int)

    # ProtectionServices
    protection_columns = [
        "OnlineSecurity",
        "OnlineBackup",
        "DeviceProtection",
        "TechSupport"
    ]

    df["ProtectionServices"] = 0

    for col in protection_columns:
        df["ProtectionServices"] += (
            df[col] == "Yes"
        ).astype(int)

    # StreamingCount
    streaming_columns = [
        "StreamingTV",
        "StreamingMovies"
    ]

    df["StreamingCount"] = 0

    for col in streaming_columns:
        df["StreamingCount"] += (
            df[col] == "Yes"
        ).astype(int)

    # AvgMonthlySpend
    df["AvgMonthlySpend"] = np.where(
        df["tenure"] > 0,
        df["TotalCharges"] / df["tenure"],
        df["MonthlyCharges"]
    )

    # ---------------------------------
    # Preprocess
    # ---------------------------------

    X_processed = preprocessor.transform(df)

    # ---------------------------------
    # Prediction
    # ---------------------------------

    probability = float(
        model.predict_proba(X_processed)[0][1]
    )

    # ---------------------------------
    # Risk category
    # ---------------------------------

    if probability >= 0.70:
        risk_level = "High"
    elif probability >= 0.40:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # ---------------------------------
    # EBM explanation
    # ---------------------------------

    local_explanation = model.explain_local(X_processed)

    explanation_data = local_explanation.data(0)

    feature_names = preprocessor.get_feature_names_out()

    feature_scores = explanation_data["scores"]

    drivers = []

    for name, score in zip(feature_names, feature_scores):
        drivers.append({
            "feature": str(name),
            "contribution": round(float(score), 4),
            "direction": "increases" if score > 0 else "decreases"
        })

    # Strongest contributors first
    drivers = sorted(
        drivers,
        key=lambda x: abs(x["contribution"]),
        reverse=True
    )[:3]

    return {
        "churn_probability": round(probability, 4),
        "churn_percentage": round(probability * 100, 2),
        "risk_level": risk_level,
        "drivers": drivers
    }
class SalesInput(BaseModel):
    lag_1: float
    lag_2: float
    lag_3: float
    lag_6: float
    lag_12: float
    roll_mean_3: float
    roll_mean_6: float
    roll_std_6: float
    mom_ratio: float
    yoy_ratio: float
    promo: float
    promo_lag_1: float
    trans_lag_1: float
    oil_lag_1: float
    hol_national: float
    hol_regional: float
    hol_local: float
    month_of_year: int
    store_nbr: int
    family: str
    type: str
    cluster: int
    city: str

@app.get("/forecast/next-month")
def forecast_next_month():
    try:
        import pandas as pd
        import numpy as np

        train_path = DATA_DIR / "sales" / "train.csv"
        stores_path = DATA_DIR / "sales" / "stores.csv"
        transactions_path = DATA_DIR / "sales" / "transactions.csv"
        oil_path = DATA_DIR / "sales" / "oil.csv"
        holidays_path = DATA_DIR / "sales" / "holidays_events.csv"

        # ---------------------------------------------------------
        # 1. Read stores metadata
        # ---------------------------------------------------------
        stores = pd.read_csv(stores_path)

        stores = stores[
            ["store_nbr", "city", "type", "cluster"]
        ].copy()

        # ---------------------------------------------------------
        # 2. Read item -> family mapping
        #    We only need item_nbr and family from train/items.
        # ---------------------------------------------------------
        items_path = DATA_DIR / "sales" / "items.csv"

        items = pd.read_csv(
            items_path,
            usecols=["item_nbr", "family"]
        )

        item_family = dict(
            zip(items["item_nbr"], items["family"])
        )

        del items

        # ---------------------------------------------------------
        # 3. Read huge train.csv in chunks
        # ---------------------------------------------------------
        required_columns = [
            "date",
            "store_nbr",
            "item_nbr",
            "unit_sales",
            "onpromotion",
        ]

        monthly_parts = []

        for chunk in pd.read_csv(
            train_path,
            usecols=required_columns,
            chunksize=1_000_000,
            low_memory=False
        ):
            chunk["date"] = pd.to_datetime(chunk["date"])

            chunk["family"] = chunk["item_nbr"].map(item_family)

            # Match notebook:
            # date -> month
            chunk["month"] = chunk["date"].dt.to_period("M").dt.to_timestamp()

            # Match notebook's promotion count
            chunk["promo"] = chunk["onpromotion"].fillna(False).astype(int)

            grouped = (
                chunk
                .groupby(
                    ["store_nbr", "family", "month"],
                    as_index=False
                )
                .agg(
                    sales=("unit_sales", "sum"),
                    promo=("promo", "sum")
                )
            )

            monthly_parts.append(grouped)

            del chunk, grouped

        # Combine already-aggregated chunks
        monthly_data = pd.concat(
            monthly_parts,
            ignore_index=True
        )

        del monthly_parts

        # Chunks may contain the same store/family/month,
        # so aggregate them again.
        monthly_data = (
            monthly_data
            .groupby(
                ["store_nbr", "family", "month"],
                as_index=False
            )
            .agg(
                sales=("sales", "sum"),
                promo=("promo", "sum")
            )
        )

        # ---------------------------------------------------------
        # 4. Store metadata
        # ---------------------------------------------------------
        monthly_data = monthly_data.merge(
            stores,
            on="store_nbr",
            how="left"
        )

        # ---------------------------------------------------------
        # 5. Monthly transactions
        # ---------------------------------------------------------
        transactions = pd.read_csv(
            transactions_path,
            usecols=["date", "store_nbr", "transactions"]
        )

        transactions["date"] = pd.to_datetime(
            transactions["date"]
        )

        transactions["month"] = (
            transactions["date"]
            .dt.to_period("M")
            .dt.to_timestamp()
        )

        transactions_monthly = (
            transactions
            .groupby(
                ["store_nbr", "month"],
                as_index=False
            )
            .agg(
                transactions=("transactions", "sum")
            )
        )

        del transactions

        monthly_data = monthly_data.merge(
            transactions_monthly,
            on=["store_nbr", "month"],
            how="left"
        )

        del transactions_monthly

        # ---------------------------------------------------------
        # 6. Monthly oil price
        # ---------------------------------------------------------
        oil = pd.read_csv(
            oil_path,
            usecols=["date", "dcoilwtico"]
        )

        oil["date"] = pd.to_datetime(oil["date"])

        oil["month"] = (
            oil["date"]
            .dt.to_period("M")
            .dt.to_timestamp()
        )

        oil_monthly = (
            oil
            .groupby("month", as_index=False)
            .agg(
                dcoilwtico=("dcoilwtico", "mean")
            )
        )

        del oil

        monthly_data = monthly_data.merge(
            oil_monthly,
            on="month",
            how="left"
        )

        del oil_monthly

        # ---------------------------------------------------------
        # 7. Fill external missing values
        # ---------------------------------------------------------
        monthly_data["transactions"] = (
            monthly_data["transactions"].fillna(0)
        )

        monthly_data["dcoilwtico"] = (
            monthly_data["dcoilwtico"].ffill().bfill()
        )

        monthly_data["dcoilwtico"] = (
            monthly_data["dcoilwtico"].fillna(0)
        )

        # ---------------------------------------------------------
        # 8. Sort exactly by store/family/month
        # ---------------------------------------------------------
        monthly_data = monthly_data.sort_values(
            ["store_nbr", "family", "month"]
        ).reset_index(drop=True)

        # ---------------------------------------------------------
        # 9. Create lag features
        # ---------------------------------------------------------
        grouped = monthly_data.groupby(
            ["store_nbr", "family"],
            sort=False
        )

        monthly_data["lag_1"] = grouped["sales"].shift(1)
        monthly_data["lag_2"] = grouped["sales"].shift(2)
        monthly_data["lag_3"] = grouped["sales"].shift(3)
        monthly_data["lag_6"] = grouped["sales"].shift(6)
        monthly_data["lag_12"] = grouped["sales"].shift(12)

        # ---------------------------------------------------------
        # 10. Rolling features
        # ---------------------------------------------------------
        monthly_data["roll_mean_3"] = (
            monthly_data["lag_1"]
            .groupby(
                [
                    monthly_data["store_nbr"],
                    monthly_data["family"]
                ]
            )
            .transform(
                lambda x: x.rolling(3).mean()
            )
        )

        monthly_data["roll_mean_6"] = (
            monthly_data["lag_1"]
            .groupby(
                [
                    monthly_data["store_nbr"],
                    monthly_data["family"]
                ]
            )
            .transform(
                lambda x: x.rolling(6).mean()
            )
        )

        monthly_data["roll_std_6"] = (
            monthly_data["lag_1"]
            .groupby(
                [
                    monthly_data["store_nbr"],
                    monthly_data["family"]
                ]
            )
            .transform(
                lambda x: x.rolling(6).std()
            )
        )

        # ---------------------------------------------------------
        # 11. Ratios
        # ---------------------------------------------------------
        monthly_data["mom_ratio"] = (
            (monthly_data["lag_1"] + 1)
            / (monthly_data["lag_2"] + 1)
        )

        monthly_data["yoy_ratio"] = (
            (monthly_data["lag_1"] + 1)
            / (
                monthly_data["lag_12"] + 1
            )
        )

        # ---------------------------------------------------------
        # 12. Lagged external features
        # ---------------------------------------------------------
        monthly_data["promo_lag_1"] = grouped["promo"].shift(1)

        monthly_data["trans_lag_1"] = grouped["transactions"].shift(1)

        monthly_data["oil_lag_1"] = grouped["dcoilwtico"].shift(1)

        # ---------------------------------------------------------
        # 13. Month feature
        # ---------------------------------------------------------
        monthly_data["month_of_year"] = (
            monthly_data["month"].dt.month
        )

        # ---------------------------------------------------------
        # 14. Holiday features
        # ---------------------------------------------------------
        holidays = pd.read_csv(
            holidays_path,
            usecols=[
                "date",
                "type",
                "locale",
                "locale_name",
                "transferred"
            ]
        )

        holidays["date"] = pd.to_datetime(
            holidays["date"]
        )

        holidays["month"] = (
            holidays["date"]
            .dt.to_period("M")
            .dt.to_timestamp()
        )

        valid_holidays = holidays[
            holidays["transferred"] == False
        ].copy()

        holiday_monthly = (
            valid_holidays
            .groupby("month")
            .agg(
                hol_national=(
                    "locale",
                    lambda x: (x == "National").sum()
                ),
                hol_regional=(
                    "locale",
                    lambda x: (x == "Regional").sum()
                ),
                hol_local=(
                    "locale",
                    lambda x: (x == "Local").sum()
                )
            )
            .reset_index()
        )

        del holidays, valid_holidays

        monthly_data = monthly_data.merge(
            holiday_monthly,
            on="month",
            how="left"
        )

        for col in [
            "hol_national",
            "hol_regional",
            "hol_local"
        ]:
            monthly_data[col] = (
                monthly_data[col].fillna(0)
            )

        # ---------------------------------------------------------
        # 15. Get latest month
        # ---------------------------------------------------------
        latest_month = monthly_data["month"].max()

        latest = monthly_data[
            monthly_data["month"] == latest_month
        ].copy()

        # Forecast next month
        forecast_month = (
            latest_month + pd.DateOffset(months=1)
        )

        latest["month"] = forecast_month
        latest["month_of_year"] = forecast_month.month

        # ---------------------------------------------------------
        # 16. Exact model features
        # ---------------------------------------------------------
        FEATURES = [
            "lag_1",
            "lag_2",
            "lag_3",
            "lag_6",
            "lag_12",
            "roll_mean_3",
            "roll_mean_6",
            "roll_std_6",
            "mom_ratio",
            "yoy_ratio",
            "promo",
            "promo_lag_1",
            "trans_lag_1",
            "oil_lag_1",
            "hol_national",
            "hol_regional",
            "hol_local",
            "month_of_year",
            "store_nbr",
            "family",
            "type",
            "cluster",
            "city"
        ]

        CATEGORICAL = [
            "store_nbr",
            "family",
            "type",
            "cluster",
            "city"
        ]

        # ---------------------------------------------------------
        # 17. Prepare prediction dataframe
        # ---------------------------------------------------------
        prediction_data = latest[FEATURES].copy()

        prediction_data = prediction_data.dropna(
            subset=[
                "lag_1",
                "lag_2",
                "lag_3",
                "lag_6",
                "lag_12",
                "roll_mean_3",
                "roll_mean_6",
                "roll_std_6"
            ]
        )

        for col in CATEGORICAL:
            prediction_data[col] = (
                prediction_data[col].astype("category")
            )

        # ---------------------------------------------------------
        # 18. Predict with existing LightGBM model
        # ---------------------------------------------------------
        predictions = sales_model.predict(
            prediction_data
        )

        predictions = np.maximum(
            predictions,
            0
        )

        predicted_sales = float(
            np.sum(predictions)
        )

        return {
            "predicted_sales": round(
                predicted_sales,
                2
            ),
            "forecast_month": forecast_month.strftime(
                "%Y-%m"
            ),
            "latest_month": latest_month.strftime(
                "%Y-%m"
            ),
            "rows_predicted": int(
                len(prediction_data)
            )
        }

    except Exception as error:
        print(
            "Next-month forecast error:",
            str(error)
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )