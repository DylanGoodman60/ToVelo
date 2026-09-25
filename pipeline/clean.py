import glob, os

RAW_DIR = "bikeshare-ridership-2025"
CLEAN_DIR = "clean"
os.makedirs(CLEAN_DIR, exist_ok=True)

for path in glob.glob(f"{RAW_DIR}/*.csv"):
    with open(path, "r", encoding="cp1252", errors="replace") as f:
        text = f.read()
    out_path = os.path.join(CLEAN_DIR, os.path.basename(path))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"cleaned {os.path.basename(path)}")
