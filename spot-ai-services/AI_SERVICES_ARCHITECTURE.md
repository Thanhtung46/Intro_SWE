# Kiến trúc AI Services của SPOT — Recommendation & NLP Assistant

Tài liệu thuyết trình: giải thích cách hoạt động của 2 microservice AI trong hệ thống SPOT — **Recommendation** (gợi ý sân) và **NLP Assistant** (trợ lý hội thoại tìm sân/kèo).

---

## 1. Bức tranh tổng thể

```
                         ┌─────────────────────┐
                         │   Mobile App (RN)    │
                         └──────────┬───────────┘
                                    │ JWT
                                    ▼
                         ┌─────────────────────┐
                         │   spot-backend       │  ← API Gateway / BFF
                         │  (Node.js/Express)   │     (xác thực, forward
                         └───┬─────────────┬────┘      kèm internal key)
                             │             │
              X-Internal-Service-Key  X-Internal-Service-Key
                             │        + X-Player-Access-Token
                             ▼             ▼
              ┌──────────────────┐  ┌──────────────────────┐
              │  recommendation   │  │    nlp-assistant      │
              │  (FastAPI :5001)  │  │   (FastAPI :5003)     │
              └────────┬─────────┘  └───────┬────────┬──────┘
                       │                    │        │
                  đọc DB trực tiếp     gọi lại      Redis
                  (schema_venue,      spot-backend  (lưu hội
                   schema_booking,    (/matches,      thoại)
                   schema_matchmaking) /venues)          │
                       │                    │            │
                       ▼                    ▼            ▼
                  Supabase Postgres    spot-backend    Redis
                                                          │
                                                          ▼
                                                    Gemini API
                                                  (gemini-2.5-flash)
```

**Điểm mấu chốt kiến trúc**: `spot-backend` đóng vai trò **API Gateway / Backend-for-Frontend (BFF)** — mobile app không bao giờ gọi trực tiếp 2 service AI này. Đây là **kiến trúc microservices**, mỗi AI service là một tiến trình FastAPI độc lập, đóng gói Docker riêng, giao tiếp qua HTTP nội bộ với header `X-Internal-Service-Key` để xác thực service-to-service.

---

## 2. Recommendation Service — Gợi ý sân cá nhân hoá

### 2.1 Loại thuật toán: Content-Based Filtering (không phải Machine Learning đã huấn luyện)

Đây **không phải** collaborative filtering (không so sánh giữa nhiều người dùng với nhau) và **không phải** một model ML đã train — mà là một **weighted scoring model** dựa trên đặc trưng (feature) tự thiết kế, có thể giải thích được hoàn toàn (explainable, không phải "hộp đen").

### 2.2 Pipeline tính điểm (3 bước)

```
1. Thu thập ứng viên (Candidate Generation)
   → fetch_candidate_venues(sport): các sân ACTIVE cùng môn thể thao

2. Trích xuất tín hiệu người dùng (Signal Extraction)
   → build_user_signal_profile(user_id): lịch sử đặt sân + lịch sử
     host/join kèo, mỗi sự kiện có trọng số suy giảm theo thời gian
     (recency-weighted, exponential decay theo half-life)

3. Chấm điểm & xếp hạng (Scoring & Ranking)
   → score_candidates(): tính 3 tín hiệu cho mỗi ứng viên, chuẩn hoá
     min-max, nhân trọng số, rồi đo cosine similarity với một
     "vector lý tưởng" (ideal vector)
```

### 2.3 Ba tín hiệu (features) đưa vào vector đặc trưng

| Tín hiệu | Ý nghĩa | Công thức |
| :--- | :--- | :--- |
| **History affinity** | Người dùng đã từng đặt/chơi ở sân này hoặc sân gần đó chưa? | Trùng `venue_id` → cộng trọng số; trùng tên sân → cộng trọng số; khác vị trí → suy giảm theo khoảng cách `exp(-distance / 10km)` |
| **Proximity** | Sân có gần vị trí người dùng đang tìm không? | `1 / (1 + distance_km)` — càng gần điểm càng cao |
| **Popularity** | Sân có đông người đặt trên toàn nền tảng không? | Đếm số booking chưa huỷ của sân, theo môn thể thao |

### 2.4 Kỹ thuật: "Ideal Point" scoring qua Cosine Similarity

```python
weights = [0.5, 0.3, 0.2]     # có lịch sử: ưu tiên history
       hoặc [0.0, 0.4, 0.6]   # cold-start: chỉ proximity + popularity

features = normalize([history, proximity, popularity])  # min-max → [0,1]
weighted = features * weights
score = cosine_similarity(weighted, ideal_vector=weights)
```

Đây là kỹ thuật **đo độ tương đồng với một "điểm lý tưởng" (ideal-point / reference-point method)** — thuộc nhóm **Multi-Criteria Decision Analysis (MCDA)**, tương tự tinh thần thuật toán TOPSIS trong recommender systems: mỗi ứng viên được so với một vector "hoàn hảo" (trọng số đầy đủ ở mọi tiêu chí), ứng viên nào có vector đặc trưng "giống" vector lý tưởng nhất (cosine similarity cao nhất) thì được xếp hạng cao nhất.

### 2.5 Xử lý Cold-Start (người dùng mới, chưa có lịch sử)

Đây là bài toán kinh điển của mọi recommender system: **"cold-start problem"**. Giải pháp ở đây: khi `history_raw.max() <= ngưỡng`, hệ thống tự động **chuyển bộ trọng số** sang chỉ dựa vào proximity + popularity (bỏ hẳn trọng số history về 0), và trả về cờ `fallback = true` để phía client biết đây là gợi ý "phổ biến/gần bạn" chứ không phải "theo sở thích cá nhân".

---

## 3. NLP Assistant — Trợ lý hội thoại tìm sân/kèo

### 3.1 Loại hệ thống: Task-Oriented Dialogue System (TOD)

Khác với chatbot mở (open-domain), đây là hệ thống hội thoại **có mục tiêu cụ thể** (tìm kèo / tìm sân trống / đặt sân) — cùng nhóm với Rasa, Dialogflow, Alexa Skills. Thành phần cốt lõi: **NLU pipeline gồm Intent Detection + Slot Filling**, cộng thêm **Dialogue State Tracking (DST)** để nhớ ngữ cảnh qua nhiều lượt hội thoại.

### 3.2 Pipeline xử lý 1 lượt tin nhắn

```
Tin nhắn người dùng
      │
      ▼
┌─────────────────────────────────────────────┐
│ 1. Intent Detection + Slot Filling (Gemini)  │  ← LLM call #1
│    → JSON: {searchKind, sport, date,         │     (bắt buộc mỗi lượt)
│             timeFrom, timeTo, province, ...} │
└──────────────────┬────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│ 2. Deterministic Normalization (code thuần)  │  ← KHÔNG dùng LLM
│    "tối nay" → 2026-09-07                    │
│    "7h tối" → "19:00"                        │
└──────────────────┬────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│ 3. Slot merge + kiểm tra thiếu trường bắt    │
│    buộc → nếu thiếu: hỏi lại (clarification) │
└──────────────────┬────────────────────────────┘
                    ▼ (đủ trường)
┌─────────────────────────────────────────────┐
│ 4. Gọi thật vào spot-backend                 │
│    GET /matches hoặc GET /venues             │
└──────────────────┬────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│ 5. Nếu người dùng muốn join/đặt: Propose →   │  ← LLM call #2 (khi có
│    Confirm/Cancel (human-in-the-loop)        │     kết quả trước đó)
└─────────────────────────────────────────────┘
```

### 3.3 Kỹ thuật quan trọng nhất: "LLM as Parser, Code as Validator"

Đây là điểm nên nhấn mạnh khi thuyết trình — hệ thống **KHÔNG** dùng Gemini's native function-calling/tool-use API, mà dùng **prompt-based structured output** (ép model trả JSON thuần qua `response_mime_type: application/json`). Điểm thiết kế cố ý:

- **Gemini chỉ trích xuất "thô"** — giữ nguyên văn người dùng nói ("tối nay", "7h", "Quận 7"), **không** tự quy đổi ngày giờ, **không** tự đoán mã tỉnh/thành.
- **Toàn bộ việc chuẩn hoá là code tất định (deterministic)**: `date_parse.py`, `time_parse.py` tự viết bằng regex + bảng tra cứu, không phụ thuộc vào việc model có "nhớ đúng" quy tắc hay không.

→ Lý do: độ chính xác của ngày/giờ/địa điểm là logic nghiệp vụ quan trọng, không nên phó mặc hoàn toàn cho một LLM có thể trả lời không nhất quán giữa các lần gọi. **Model xử lý phần mơ hồ của ngôn ngữ tự nhiên; code xử lý phần cần chính xác tuyệt đối.**

### 3.4 Dialogue State Tracking qua Redis

Mỗi hội thoại (`conversationId`) được lưu trong Redis với:
- `messages`: lịch sử tin nhắn (tối đa 10 tin gần nhất được đưa vào prompt)
- `lastInterpretedRequest`: các tiêu chí tìm kiếm đã biết (giữ lại giữa các lượt — người dùng có thể nói "còn ở Quận 7 thì sao?" mà không cần lặp lại toàn bộ câu hỏi)
- `lastResults` / `lastVenueResults`: kết quả tìm được gần nhất (để xử lý "join sân đầu tiên đi")
- `pendingAction`: hành động đang chờ xác nhận

### 3.5 Human-in-the-Loop Confirmation

Trước khi thực hiện hành động có tác dụng phụ thật (join kèo), hệ thống luôn đi qua 2 bước: **Propose** (tóm tắt lại, hỏi xác nhận) → **Confirm/Cancel** (LLM phân loại phản hồi có phải ý xác nhận không). Không có bước nào tự động thực thi ngay từ 1 câu nói mơ hồ.

---

## 4. So sánh nhanh 2 service

| | Recommendation | NLP Assistant |
| :--- | :--- | :--- |
| Loại bài toán | Xếp hạng (ranking) | Hiểu ngôn ngữ tự nhiên (NLU) + hội thoại |
| Có dùng LLM không | Không — thuật toán toán học thuần (numpy/sklearn) | Có — Gemini 2.5 Flash, mỗi lượt tin nhắn 1-2 lần gọi |
| "Học" từ đâu | Tín hiệu hành vi thật trong DB (booking, join kèo) — không train offline | Không học/train — dùng LLM có sẵn qua prompt engineering |
| Trạng thái | Không lưu trạng thái (stateless — tính lại mỗi request) | Có trạng thái (Redis lưu hội thoại nhiều lượt) |
| Kỹ thuật cốt lõi | Weighted scoring + cosine similarity với ideal vector, cold-start fallback | Slot filling qua LLM + chuẩn hoá tất định bằng code |

---

## 5. Gợi ý câu mở đầu khi thuyết trình

> *"Hệ thống AI của SPOT gồm 2 microservice độc lập: Recommendation Service dùng một mô hình chấm điểm có trọng số (weighted scoring, dựa trên độ tương đồng cosine với một vector lý tưởng) để xếp hạng sân theo lịch sử, khoảng cách và độ phổ biến — không phải machine learning đã huấn luyện mà là một hệ thống rule-based có thể giải thích được. NLP Assistant là một Task-Oriented Dialogue System, dùng LLM (Gemini) cho phần Intent Detection và Slot Filling từ ngôn ngữ tự nhiên tiếng Việt, nhưng toàn bộ việc chuẩn hoá dữ liệu (ngày giờ, địa danh) được xử lý bằng code tất định để đảm bảo độ chính xác — mô hình chỉ 'hiểu ý', code mới 'quyết định đúng'."*
