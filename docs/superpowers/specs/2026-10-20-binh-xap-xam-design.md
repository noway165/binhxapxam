# Binh Xập Xám Online — Thiết kế

Ngày: 2026-10-20

## 1. Mục tiêu

Game Binh Xập Xám (Mậu Binh) chơi trên trình duyệt để chơi online cùng bạn bè: mỗi người một máy (điện thoại hoặc máy tính), 2–4 người một phòng, vào phòng bằng mã/link. Có tài khoản (tên + mật khẩu), lưu lịch sử ván và điểm tích lũy. Triển khai trên hosting miễn phí để ai cũng truy cập được qua link.

**Thành công khi:** 2–4 người ở các máy khác nhau vào cùng phòng, chơi liên tiếp nhiều ván, luật và điểm được tính đúng theo mục 3, không ai thấy được bài người khác trước khi lật, rớt mạng vào lại vẫn chơi tiếp được.

**Ngoài phạm vi (không làm ở bản này):** chat, người xem, chơi với bot, âm thanh, danh sách phòng công khai, thưởng "sập làng", đăng nhập Google, khôi phục ván dở khi server khởi động lại.

## 2. Kiến trúc

Monorepo TypeScript dùng npm workspaces:

```
packages/
  rules/   — luật chơi thuần TypeScript, không phụ thuộc, dùng chung cho server và client
  server/  — Node + Express + Socket.IO + Prisma (PostgreSQL)
  client/  — React + Vite
```

- **Server là nguồn sự thật duy nhất:** xáo bài, chia bài, đồng hồ, chấm điểm, lưu kết quả. Client chỉ hiển thị và gửi thao tác. Mọi dữ liệu client gửi lên đều được kiểm tra (zod + kiểm tra 13 lá đúng là bài đã chia cho người đó).
- **Trạng thái phòng** nằm trong bộ nhớ server. Ván đã xong được lưu vào DB. Server khởi động lại thì mất phòng và ván đang dở (chấp nhận).
- **Triển khai:** một service Node trên Render (vừa phục vụ bản build React, vừa chạy Socket.IO) + PostgreSQL miễn phí trên Neon. Biến môi trường: `DATABASE_URL`, `JWT_SECRET`.

## 3. Luật chơi (package `rules`)

### 3.1 Lá bài

- Giá trị 2..14 (J=11, Q=12, K=13, A=14). Chất: Bích, Cơ, Rô, Chuồn.
- Chất chỉ dùng để xét Thùng, không dùng để so thắng thua.

### 3.2 Loại bài và cách so

Hạng từ mạnh đến yếu:

| Hạng | Loại | Áp dụng cho | Vector so khi cùng loại |
|---|---|---|---|
| 8 | Thùng phá sảnh | 5 lá | lá cao nhất của sảnh |
| 7 | Tứ quý | 5 lá | [giá trị tứ quý, lá lẻ] |
| 6 | Cù lũ | 5 lá | [giá trị xám, giá trị đôi] |
| 5 | Thùng | 5 lá | 5 giá trị giảm dần |
| 4 | Sảnh | 5 lá | lá cao nhất của sảnh |
| 3 | Xám cô | 5 và 3 lá | [giá trị xám, các lá lẻ giảm dần] |
| 2 | Thú | 5 lá | [đôi lớn, đôi nhỏ, lá lẻ] |
| 1 | Đôi | 5 và 3 lá | [giá trị đôi, các lá lẻ giảm dần] |
| 0 | Mậu thầu | 5 và 3 lá | các giá trị giảm dần |

- **Sảnh:** 5 giá trị liên tiếp. A‑2‑3‑4‑5 hợp lệ, là sảnh nhỏ nhất (lá cao nhất tính là 5). 10‑J‑Q‑K‑A là sảnh lớn nhất. Không cho vòng kiểu Q‑K‑A‑2‑3.
- **Chi 3 (3 lá)** khi so bài thông thường chỉ có Xám, Đôi hoặc Mậu thầu.
- **Cách so:** so hạng trước. Cùng hạng thì so vector theo thứ tự từ trái sang phải. Nếu hai vector dài khác nhau (so chi 5 lá với chi 3 lá khi kiểm tra lủng), chỉ so đến hết vector ngắn hơn; bằng nhau đến đó thì coi là bằng nhau.
- Giống hệt nhau thì hòa.

### 3.3 Binh lủng

Một cách xếp bị **lủng** khi `Chi1 < Chi2` hoặc `Chi2 < Chi3` theo cách so ở 3.2.

### 3.4 Thắng trắng

Hệ thống tự kiểm tra trên 13 lá của mỗi người, không phụ thuộc người đó xếp thế nào, và người chơi không cần báo:

- **Sảnh rồng:** đủ 13 giá trị từ 2 đến A.
- **Lục phé bôn:** tổng số đôi đạt từ 6 trở lên, tính số đôi của mỗi giá trị bằng `floor(số lá cùng giá trị / 2)`. Như vậy Xám tính là 1 đôi, Tứ quý tính là 2 đôi.
- **3 thùng:** tồn tại một cách chia 5‑5‑3 mà mỗi chi đều đồng chất.
- **3 sảnh:** tồn tại một cách chia 5‑5‑3 mà mỗi chi đều là các giá trị liên tiếp. Chi 3 chấp nhận cả A‑2‑3 và Q‑K‑A.

Người thắng trắng thì không bị xét lủng. Các loại thắng trắng ngang nhau, không loại nào hơn loại nào.

### 3.5 Tính điểm

Mỗi cặp người chơi (A, B) được so riêng. Điểm ròng của A với B ký hiệu là `net(A,B)`, và luôn có `net(B,A) = -net(A,B)`.

1. **Thắng trắng:**
   - Chỉ A thắng trắng: `net = +6`.
   - Cả hai cùng thắng trắng: `net = 0`.
2. **Lủng** (khi không ai thắng trắng):
   - Cả hai cùng lủng: `net = 0`.
   - Chỉ B lủng: A được tính như thắng cả 3 chi, `net = (giá trị chi1 + chi2 + chi3 của A) × 2`.
3. **So bình thường:**
   - Với mỗi chi, người thắng chi đó nhận **giá trị chi** của bài mình, người thua mất đúng số đó. Hòa thì 0.
   - Bảng giá trị chi:
     - Chi 1: Thùng phá sảnh 5, Tứ quý 4, các loại khác 1.
     - Chi 2: Thùng phá sảnh 10, Tứ quý 8, Cù lũ 2, các loại khác 1.
     - Chi 3: Xám 3, các loại khác 1.
   - **Sập hầm:** một người thắng cả 3 chi (không chi nào hòa) thì `net` được nhân 2.

Điểm ván của mỗi người là `Σ net(người đó, từng người còn lại)`. Tổng điểm cả bàn luôn bằng 0.

### 3.6 Tự xếp bài (`autoArrange`)

- Duyệt toàn bộ C(13,5)·C(8,5) = 72.072 cách chia 13 lá thành 5‑5‑3.
- Bỏ các cách bị lủng.
- Trong các cách còn lại, chọn cách có tổng hạng 3 chi lớn nhất. Hòa thì ưu tiên chi 1 mạnh hơn, rồi đến chi 2, rồi chi 3.
- Luôn tồn tại ít nhất một cách không lủng.
- Dùng khi hết giờ mà người chơi chưa nộp bài.

### 3.7 Các module

`cards` (bộ bài, xáo, chia), `evaluate`, `compare` (gồm `isFoul`), `special`, `scoring`, `autoArrange`.

## 4. Phòng và luồng một ván

- **Mã phòng:** 6 ký tự (bỏ các ký tự dễ nhầm như 0/O, 1/I), link dạng `/room/<mã>`.
- **Số người:** tối đa 4, cần ít nhất 2 người mới bắt đầu được.
- **Chủ phòng:** người tạo phòng.
- **Thời gian xếp:** 30–300 giây, mặc định 90 giây, chỉ chủ phòng chỉnh được (ở trạng thái CHỜ).

**Các trạng thái của phòng:** `WAITING → ARRANGING → REVEAL → (Ván mới) ARRANGING …`. Ván xong mà phòng còn dưới 2 người thì quay về `WAITING`.

1. **ARRANGING**
   - Server chia bài và gửi riêng cho từng người kèm thời điểm hết giờ (`deadline`).
   - Người chơi nộp bài (`hand:submit`) và có thể rút lại để sửa (`hand:unsubmit`) khi còn giờ.
   - Người khác chỉ thấy trạng thái đang xếp/xong.
2. **Chấm điểm:** khi tất cả đã nộp hoặc hết giờ, server gọi `autoArrange` cho ai chưa nộp, chấm điểm, lưu vào DB, cập nhật điểm phòng và tổng điểm tài khoản.
3. **REVEAL:** server gửi `game:result` một lần. Client diễn hoạt lật lần lượt Chi 1, Chi 2, Chi 3, sau đó báo thắng trắng/lủng, rồi bảng điểm từng cặp và điểm cộng dồn.
4. Chủ phòng bấm **Ván mới**.

**Sự kiện socket:**
- Client → server: `room:create`, `room:join`, `room:leave`, `room:settings`, `game:start`, `game:next`, `hand:submit {chi1, chi2, chi3}`, `hand:unsubmit`.
- Server → client: `room:state`, `game:dealt` (gửi riêng từng người), `game:progress`, `game:result`, `error {message}`.

**Rớt mạng và các tình huống đặc biệt:**
- Người chơi được nhận diện theo tài khoản, không theo socket. Vào lại (kể cả F5) sẽ nhận lại trạng thái phòng, bài của mình và `deadline`.
- Rớt mạng thì đồng hồ vẫn chạy. Hết giờ mà chưa vào lại thì máy tự xếp cho người đó.
- Vào phòng giữa ván thì chờ đến ván sau. Phòng đã đủ 4 người thì từ chối.
- Bấm Rời phòng giữa ván thì bài vẫn được tự xếp và tính điểm ván đó.
- Chủ phòng rời đi thì quyền chuyển cho người vào sớm nhất. Phòng trống quá 10 phút thì bị xóa.
- Mỗi tài khoản chỉ ở một phòng tại một thời điểm. Kết nối mới thay thế kết nối cũ, và tab cũ nhận thông báo bị ngắt.

## 5. Giao diện (client)

Thiết kế ưu tiên điện thoại, chạy tốt từ chiều ngang 360px. Lá bài vẽ bằng CSS/SVG, không dùng file ảnh.

**Màn hình:**
1. **Đăng nhập / Đăng ký.**
2. **Sảnh:** nút Tạo phòng, ô nhập mã phòng, tổng điểm của tôi, link sang Lịch sử và Bảng xếp hạng.
3. **Phòng chờ:** danh sách người chơi, mã phòng và nút sao chép link, cài đặt thời gian (chỉ chủ phòng), nút Bắt đầu.
4. **Bàn chơi, lúc xếp bài:**
   - Đối thủ hiện ở phía trên kèm trạng thái (đang xếp/xong/mất kết nối). Có thanh đếm ngược.
   - Khu xếp bài có 3 hàng theo kiểu truyền thống: Chi 3 (3 ô) ở trên, Chi 2 (5 ô) ở giữa, Chi 1 (5 ô) ở dưới. Bài được chia sẵn vào các ô theo thứ tự giá trị.
   - **Thao tác:** chạm một lá rồi chạm lá khác để đổi chỗ (dùng được trên điện thoại). Trên máy tính có thể kéo thả.
   - Cạnh mỗi hàng ghi tên loại bài, ví dụ "Cù lũ".
   - Khi đang lủng thì viền đỏ, kèm dòng "Binh lủng: Chi 2 mạnh hơn Chi 1". Vẫn cho nộp.
   - Nút **Xếp theo giá trị**, **Xếp theo chất**, **Xong / Sửa lại**.
5. **Bàn chơi, lúc lật bài:** bài mọi người lật theo từng chi, mỗi chi khoảng 1,5 giây, đánh dấu ai thắng chi đó. Sau đó hiện huy hiệu Thắng trắng/Lủng/Sập hầm, bảng điểm từng cặp, điểm ván và điểm cộng dồn của phòng. Chủ phòng có nút Ván mới.
6. **Lịch sử:** danh sách các ván gần đây của tôi (thời gian, người chơi, điểm). Bấm vào để xem lại bài và kết quả của từng người.
7. **Bảng xếp hạng:** xếp các tài khoản theo tổng điểm.

## 6. Dữ liệu (Prisma / PostgreSQL)

- `User`:
  - `id`, `username` (duy nhất, 3–20 ký tự `[a-zA-Z0-9_]`, không phân biệt hoa thường)
  - `passwordHash` (bcrypt), `totalScore` (mặc định 0), `gamesPlayed`, `createdAt`
- `Game`: `id`, `roomCode`, `timeLimitSec`, `startedAt`, `endedAt`
- `GamePlayer`:
  - `gameId`, `userId`, `cards` (json, 13 lá), `chi1`, `chi2`, `chi3` (json)
  - `autoArranged` (bool), `foul` (bool), `special` (chuỗi hoặc null), `score` (int)
  - `pairResults` (json: kết quả so từng chi và `net` với từng đối thủ)

Lưu một ván là một transaction: tạo `Game` và các `GamePlayer`, đồng thời cộng `totalScore` và `gamesPlayed` cho các `User`.

## 7. Xác thực và bảo mật

- REST: `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me`, `GET /api/history`, `GET /api/games/:id`, `GET /api/leaderboard`.
- Mật khẩu tối thiểu 6 ký tự, băm bằng bcrypt.
- Phiên đăng nhập dùng JWT trong cookie `httpOnly`, `SameSite=Lax`, `Secure` khi chạy production, hạn 30 ngày.
- Kết nối Socket.IO cũng xác thực bằng cookie này.
- Giới hạn số lần đăng nhập sai: 10 lần mỗi phút cho mỗi IP.
- Server không bao giờ gửi bài của người khác trước REVEAL. `room:state` không chứa bài.

## 8. Xử lý lỗi

- **Lỗi thao tác** (không phải chủ phòng, sai trạng thái, bài không hợp lệ, phòng đầy, mã sai): server gửi `error {message}` bằng tiếng Việt, client hiện thông báo nổi (toast). Trạng thái phòng không đổi.
- **Mất kết nối:** client hiện banner "Đang kết nối lại…". Socket.IO tự nối lại, và server gửi lại toàn bộ trạng thái cho người đó.
- **Lỗi DB khi lưu ván:** ghi log, nhưng vẫn gửi kết quả cho người chơi để không treo ván. Ván đó có thể không xuất hiện trong lịch sử.

## 9. Kiểm thử

- **`rules`** (Vitest, test theo bảng dữ liệu, ưu tiên cao nhất):
  - Nhận diện đúng từng loại bài cho cả 5 lá và 3 lá, bao gồm A‑2‑3‑4‑5 và 10‑J‑Q‑K‑A.
  - So bài khi cùng loại, các trường hợp hòa, so chi 5 lá với chi 3 lá.
  - Lủng.
  - Đủ 4 loại thắng trắng, gồm cả trường hợp lục phé bôn có xám hoặc tứ quý.
  - Tính điểm từng cặp: giá trị chi, sập hầm, lủng, thắng trắng, và tổng cả bàn bằng 0.
  - `autoArrange` không bao giờ trả về cách xếp lủng (kiểm tra trên nhiều bộ bài ngẫu nhiên) và chạy dưới 200ms.
- **`server`:**
  - Unit test logic phòng dùng đồng hồ giả: chuyển trạng thái, hết giờ thì tự xếp, chuyển chủ phòng, vào lại sau khi rớt mạng.
  - Test tích hợp với 2–3 client Socket.IO thật chơi trọn một ván, với DB test.
- **`client`:** test thao tác đổi chỗ lá bài và hiển thị cảnh báo lủng. Ngoài ra kiểm tra thủ công trên trình duyệt với nhiều tab hoặc nhiều tài khoản.
