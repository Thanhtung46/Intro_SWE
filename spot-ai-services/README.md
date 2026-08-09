# SPOT AI Services

Ba microservice Python/FastAPI phục vụ nền tảng SPOT:

| Service | Port | Mục đích |
| :--- | :--- | :--- |
| `recommendation/` | 5001 | Gợi ý sân/khung giờ cho người dùng |
| `noshow-prediction/` | 5002 | Dự đoán khả năng no-show của lượt đặt |
| `nlp-assistant/` | 5003 | Trợ lý hội thoại (NLP) |

## Status

**Empty scaffold — chưa có code.** Mỗi service chỉ có sẵn thư mục rỗng
(`app/`, `models/`, `services/`, và `data/` với 2 service đầu). Không có
`requirements.txt`, không có `Dockerfile`, không có file Python nào. Xem
`CLAUDE.md` trong thư mục này để biết chi tiết.

## Quick Start

Chưa chạy được — cần thêm `requirements.txt` + code FastAPI trước. Khi đã
có, quy trình dự kiến cho từng service:

```bash
cd recommendation   # hoặc noshow-prediction / nlp-assistant
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5001
```

## Docker

`docker-compose.yml` ở repo root đã khai báo 3 service này
(`recommendation`, `noshow`, `nlp`), nhưng `docker compose build` sẽ fail
ngay vì chưa có `Dockerfile` trong từng thư mục.

## Project Structure

```
recommendation/       {app,models,services,data}/    # rỗng
noshow-prediction/    {app,models,services,data}/    # rỗng
nlp-assistant/         {app,models,services}/          # rỗng
logs/                                                   # rỗng
```

## Code Style

PEP8 qua `black` (line length 88) + `isort` — theo quy ước chung của dự án
(xem `CLAUDE.md` ở repo root).
