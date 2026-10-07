import joblib
import pandas as pd
import numpy as np

# -----------------------------
# Paths
# -----------------------------
model_path = "models/churn/final_ebm.pkl"
preprocessor_path = "models/churn/preprocessor.pkl"
data_path = "data/churn/IBM dataset.csv"

# -----------------------------
# Load model + preprocessor
# -----------------------------
model = joblib.load(model_path)
preprocessor = joblib.load(preprocessor_path)

print("Model loaded successfully!")
print("Preprocessor loaded successfully!")

# -----------------------------
# Load dataset
# -----------------------------
df = pd.read_csv(data_path)

print("\nDataset loaded successfully!")
print("Rows:", len(df))
print("Columns:", len(df.columns))

# -----------------------------
# Clean TotalCharges
# -----------------------------
df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"],
    errors="coerce"
)

# -----------------------------
# Feature engineering
# Same features used during training
# -----------------------------

# 1. NewCustomer
df["NewCustomer"] = (
    df["tenure"] <= 6
).astype(int)

# 2. TenureGroup
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

# 3. IsMonthToMonth
df["IsMonthToMonth"] = (
    df["Contract"] == "Month-to-month"
).astype(int)

# 4. HouseholdSize
df["HouseholdSize"] = (
    1
    + (df["Partner"] == "Yes").astype(int)
    + (df["Dependents"] == "Yes").astype(int)
)

# 5. ServiceCount
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

# 6. ProtectionServices
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

# 7. StreamingCount
streaming_columns = [
    "StreamingTV",
    "StreamingMovies"
]

df["StreamingCount"] = 0

for col in streaming_columns:
    df["StreamingCount"] += (
        df[col] == "Yes"
    ).astype(int)

# 8. AvgMonthlySpend
df["AvgMonthlySpend"] = np.where(
    df["tenure"] > 0,
    df["TotalCharges"] / df["tenure"],
    df["MonthlyCharges"]
)

print("\nFeature engineering successful!")

# -----------------------------
# Prepare model input
# -----------------------------

# Remove target
X = df.drop(columns=["Churn"])

# Remove customer ID
if "customerID" in X.columns:
    X = X.drop(columns=["customerID"])

print("\nFeatures sent to preprocessor:")
print(X.columns.tolist())

# -----------------------------
# Preprocess
# -----------------------------
X_processed = preprocessor.transform(X)

print("\nPreprocessing successful!")

# -----------------------------
# Predict churn
# -----------------------------
predictions = model.predict_proba(X_processed)[:, 1]

print("\nPrediction successful!")

print("\nFirst 10 churn probabilities:")

for i, probability in enumerate(predictions[:10]):
    print(
        f"Customer {i + 1}: "
        f"{probability:.2%}"
    )

print(
    "\nAverage churn probability:",
    f"{predictions.mean():.2%}"
)