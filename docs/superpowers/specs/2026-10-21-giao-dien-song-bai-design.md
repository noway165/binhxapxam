# Nâng cấp giao diện "Sòng bài cổ điển" — Thiết kế

Ngày: 2026-10-21 · Áp dụng cho `packages/client`. Luật chơi, server và socket **không đổi**.

## 1. Mục tiêu

Game đã chơi ổn, nhưng giao diện chưa đạt. Người dùng nêu bốn vấn đề:
1. Trông đơn sơ, không ra một bàn bài.
2. Lá bài xấu.
3. Thiếu hiệu ứng, cảm giác "đơ".
4. Xếp bài trên điện thoại khó.

Bản nâng cấp này phải sửa cả bốn, theo phong cách **sòng bài cổ điển**: nỉ xanh, viền gỗ, điểm nhấn vàng đồng.

**Thành công khi:**
- Chơi trên điện thoại (360–430px) và máy tính đều có cảm giác ngồi quanh một bàn bài thật.
- Lá bài giống bài tây thật.
- Chia, xếp và lật bài có chuyển động mượt.
- Kéo thả để xếp bài dễ dàng trên điện thoại.
- Có âm thanh, và tắt được.

**Ngoài phạm vi:** ảnh đại diện tải lên, chat, đổi giao diện trong game, thay đổi luật chơi hay server.

## 2. Hướng kỹ thuật

- Giữ React và Vite. Thêm thư viện **`motion`** (thế hệ sau của framer-motion) cho chuyển động, lật 3D, kéo thả và layout animation.
- Không dùng game engine.
- Bọc app trong `MotionConfig reducedMotion="user"`. Ai bật "giảm chuyển động" trong hệ điều hành thì hiệu ứng di chuyển được thay bằng hiện/ẩn tức thì.
- Logic thuần đã có giữ nguyên và tiếp tục dùng: `arrangeState.ts`, `socket.ts`, `@binh/rules`.

## 3. Tài nguyên (assets)

- **Bộ bài SVG 52 lá + mặt sau:**
  - Phải có giấy phép public domain hoặc CC0. Ứng viên là bộ "English pattern" vector của Byron Knoll trên Wikimedia Commons (public domain).
  - Đặt trong `packages/client/public/cards/<cardKey>.svg` (ví dụ `AS.svg`, `TD.svg`) và `back.svg`.
  - Mặt sau màu đỏ đô có hoa văn. Nếu bộ bài không có mặt sau phù hợp thì tự vẽ SVG.
- **Âm thanh:**
  - Lấy từ bộ "Casino Audio" của Kenney (CC0), dạng `.ogg` hoặc `.mp3` nhỏ.
  - Gồm: `deal` (chia bài), `flip` (lật), `place` (đặt hoặc đổi lá), `win` (thắng chi hoặc sập hầm), `fanfare` (thắng trắng), `tick` (tích tắc).
  - Đặt trong `packages/client/public/sounds/`.
- **Giấy phép:** ghi rõ nguồn và giấy phép của từng bộ trong `packages/client/public/ASSETS-LICENSE.md`.
- **Phương án dự phòng:** nếu không tìm được bộ bài đạt chuẩn giấy phép, vẽ lá bài bằng SVG hoặc CSS: số ở hai góc, chất xếp đúng vị trí, J/Q/K là chữ cái lớn có khung. Phương án này phải được báo lại cho người dùng.

## 4. Chủ đề màu (theme)

Định nghĩa token trong `styles/theme.css`:

| Token | Giá trị |
|---|---|
| `--felt` | `#1f5c3f` |
| `--felt-dark` | `#174a32` |
| `--wood` | `#5b3a1e` |
| `--wood-light` | `#7a5230` |
| `--gold` | `#d9b45a` |
| `--gold-dark` | `#3b2a08` |
| `--cream` | `#f6efdc` |
| `--red` | `#c62828` |
| `--win` | `#7ee2a8` |

- Nền trang tối như ánh đèn sòng bài; mặt bàn là nỉ có vân nhẹ.
- Chữ tiêu đề dùng font serif cổ điển (Google Fonts "Playfair Display", có hỗ trợ tiếng Việt). Phần chữ còn lại dùng font hệ thống.
- Login, sảnh, phòng chờ, lịch sử và bảng xếp hạng đều dùng cùng tông màu này: bảng gỗ viền vàng, nút vàng đồng. Chức năng các trang giữ nguyên.

## 5. Bàn chơi

### 5.1 Bố cục
- Mặt bàn hình bầu dục: nỉ xanh, viền gỗ dày, chỉ vàng mảnh bên trong.
- **Bạn luôn ngồi ở cạnh dưới.** Đối thủ xếp theo thứ tự vào phòng, xoay vòng bắt đầu từ người ngay sau bạn:

| Số người | Vị trí đối thủ |
|---|---|
| 2 | trên |
| 3 | trái, phải |
| 4 | trái, trên, phải |

- Giữa bàn có bộ bài úp (lúc chia) và **đồng hồ vòng tròn** (vòng vàng chạy hết dần; chuyển đỏ khi còn dưới 10 giây).

### 5.2 Ghế (Seat)
- Mỗi ghế có:
  - Avatar tròn với 2 chữ cái đầu của tên, trên nền màu cố định theo tên (băm tên ra 1 trong 8 màu).
  - Tên và điểm cả phòng.
  - Vương miện cho chủ phòng.
- Trạng thái:
  - **Đang xếp:** vòng chấm chạy.
  - **Xong:** dấu ✓ xanh, kèm 3 hàng bài úp nhỏ trước mặt.
  - **Mất kết nối:** avatar mờ, kèm biểu tượng mất sóng.
  - **Chờ ván sau:** nhãn nhỏ.

### 5.3 Theo từng giai đoạn
- **WAITING:**
  - Bàn trống, các ghế đã có người ngồi.
  - Bảng điều khiển (sao chép link, thời gian, Bắt đầu) nằm phía dưới bàn.
  - Ghế trống hiện "Mời bạn" để sao chép link.
- **ARRANGING:**
  - Hiệu ứng chia bài.
  - Sau đó **khay xếp bài** của bạn phóng to: chiếm khoảng 70% chiều cao màn hình trên điện thoại, nằm dưới bàn trên máy tính.
  - Đối thủ thu thành dải nhỏ phía trên để vẫn thấy trạng thái.
- **REVEAL:** hiệu ứng lật (mục 7), sau đó là bảng tổng kết và nút "Ván mới" cho chủ phòng.

## 6. Khay xếp bài (ArrangeTray)

- Thay cho `ArrangeBoard`. Giữ nguyên mô hình 13 ô của `arrangeState.ts`: ô 0–2 là chi 3, 3–7 là chi 2, 8–12 là chi 1.
- 3 hàng: Chi 3 ở trên, Chi 1 ở dưới.
  - Cạnh mỗi hàng ghi tên chi và loại bài.
  - Chi đang lủng có viền đỏ, kèm dòng cảnh báo như hiện nay.
- Lá bài trong khay rộng tối thiểu 56px trên màn hình 360px; hàng 5 lá vừa khít chiều ngang.
- **Kéo thả:**
  - Nhấn giữ và kéo một lá: lá được nhấc lên, phóng to 1.08 và có bóng đổ.
  - Thả lên một lá khác thì **hai lá đổi chỗ** (hàm `swap`), lá kia trượt về vị trí mới bằng layout animation.
  - Thả ra ngoài khay thì lá bay về chỗ cũ.
  - Ô đích được xác định từ tọa độ con trỏ bằng hàm thuần `slotAt(point, slotRects)`.
- **Chạm đổi:** giữ như hiện nay (chạm lá A rồi chạm lá B), nay có thêm hiệu ứng trượt.
- Nút "Xếp theo giá trị", "Xếp theo chất", và "Xong" / "Sửa lại" (to, màu vàng).
- Sau khi bấm Xong, các lá mờ đi một chút và không kéo được nữa.
- Mỗi lần đổi chỗ phát tiếng `place`.

## 7. Hiệu ứng

| Thời điểm | Hiệu ứng | Âm thanh |
|---|---|---|
| Bắt đầu ván | 13 lá úp bay từ bộ bài giữa bàn tới từng ghế, lần lượt cách nhau ~30ms; bài của bạn lật ngửa sau khi chia xong | `deal` (mỗi đợt), `flip` |
| Đối thủ bấm Xong | Ghế hiện ✓ và chồng bài úp gọn lại | — |
| Còn 10 giây | Đồng hồ đỏ, nhịp đập nhẹ | `tick` mỗi giây |
| Lật bài | Cả bàn lật Chi 1 cùng lúc (xoay 3D theo trục Y), nghỉ ~1,5s, rồi Chi 2, rồi Chi 3 | `flip` mỗi chi |
| Sau mỗi chi | Chi mạnh nhất (cùng quy tắc với `RevealView` hiện nay) sáng viền vàng; "+N" bay lên trên ghế người thắng chi đó so với bạn | `win` nếu bạn thắng chi |
| Kết quả đặc biệt | Banner lớn giữa bàn: "SẬP HẦM", "THẮNG TRẮNG — <loại>", "BINH LỦNG" | `fanfare` / `win` |
| Tổng kết | Điểm ván chạy số từ 0, xanh khi dương, đỏ khi âm; bảng các cặp như hiện nay | — |

- Thứ tự và nội dung chữ (các nhãn "Binh lủng", "Sập hầm", "Máy xếp", tên thắng trắng, "Tổng kết") giữ như `RevealView` hiện nay, để các test cũ vẫn đúng.
- Hiệu ứng **không** được làm chậm thao tác:
  - Xem lại ván trong Lịch sử thì hiện ngay, không có hoạt cảnh.
  - Hoạt cảnh lật bài có nút "Bỏ qua".

## 8. Âm thanh

- Module `sound.ts` gồm:
  - `play(name)`: dùng `HTMLAudioElement` tải sẵn, mỗi tiếng một phiên bản. Phát lỗi (trình duyệt chặn tự phát) thì bỏ qua im lặng.
  - `isMuted()` / `setMuted(b)`: lưu vào `localStorage` khóa `binh_muted`. Đọc hoặc ghi lỗi thì coi như đang bật tiếng.
- Mặc định **bật tiếng**. Nút loa nằm ở góc trên phải mọi màn hình trong phòng.

## 9. Thay đổi mã nguồn (client)

| File | Việc |
|---|---|
| `src/styles/theme.css` (thay `styles.css`) | Token màu, font, nền; style chung |
| `src/cards/PlayingCard.tsx` (thay `components/CardView.tsx`) | `<img>` SVG mặt bài hoặc mặt sau; giữ `aria-label = cardKey` và props `selected / highlight / faceDown` |
| `src/table/seating.ts` | `seatLayout(players, myId) → { me, others: { player, position: 'left'\|'top'\|'right' }[] }` |
| `src/table/Table.tsx`, `src/table/Seat.tsx`, `src/table/TimerRing.tsx` | Bàn, ghế, đồng hồ vòng |
| `src/arrange/ArrangeTray.tsx` (thay `ArrangeBoard.tsx`), `src/arrange/slotAt.ts` | Khay xếp bài kéo thả |
| `src/reveal/RevealTable.tsx` (thay `components/RevealView.tsx`) | Lật bài trên bàn, banner, tổng kết; vẫn hỗ trợ `animate={false}` cho trang lịch sử |
| `src/sound.ts`, `src/components/SoundToggle.tsx` | Âm thanh |
| `src/pages/*` | Áp theme; `RoomPage` dùng `Table` |

## 10. Kiểm thử

- **Unit:**
  - `seatLayout` cho 2, 3, 4 người và cho người đang chờ ván sau.
  - `slotAt` gồm điểm trong ô, điểm ngoài khay và điểm nằm giữa hai ô.
  - `sound`: tắt tiếng được nhớ lại; `localStorage` lỗi thì không crash; `play` khi đang tắt tiếng thì không phát.
- **Component:** chuyển các test `ArrangeBoard` và `RevealView` hiện có sang `ArrangeTray` và `RevealTable`, giữ nguyên ý nghĩa: đổi chỗ, tên chi, cảnh báo lủng, khóa sau khi nộp, thứ tự lật, các nhãn.
- **Thủ công trên trình duyệt** (mobile 375px và desktop), cùng với bot:
  - chia bài;
  - kéo thả đổi chỗ;
  - lủng rồi sửa;
  - nộp bài;
  - lật bài và banner;
  - Ván mới;
  - tắt và bật tiếng;
  - kiểm tra với chế độ giảm chuyển động (trình duyệt có thể giả lập).
- Bundle client sau nâng cấp: JS (gzip) không vượt quá 200KB. Ảnh bài và âm thanh tải riêng và được cache.
