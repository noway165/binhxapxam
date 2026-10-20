# Binh Xập Xám Online

Game Binh Xập Xám (Mậu Binh) chơi online trên trình duyệt, 2–4 người một phòng, có tài khoản, lịch sử ván và bảng xếp hạng.

Luật chơi và thiết kế: [docs/superpowers/specs/2026-10-20-binh-xap-xam-design.md](docs/superpowers/specs/2026-10-20-binh-xap-xam-design.md)

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `packages/rules` | Luật chơi: nhận diện bài, so bài, binh lủng, thắng trắng, tính điểm, tự xếp bài |
| `packages/server` | Node + Express + Socket.IO + Prisma (PostgreSQL) |
| `packages/client` | React + Vite |

## Chạy trên máy

Cần Node 22 trở lên.

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:5173. Không cần database: khi không có `DATABASE_URL`, dữ liệu chỉ lưu trong bộ nhớ và mất khi tắt server.

**Chơi thử một mình:** tạo phòng trên trình duyệt, lấy mã phòng (ví dụ `ABC234`), rồi mở terminal khác cho bot vào phòng. Bot tự xếp bài mỗi ván:

```bash
npx tsx packages/server/scripts/devBot.ts ABC234 bot_1
```

## Chạy test

```bash
npm test
```

Test của lớp lưu trữ Prisma chỉ chạy khi có `TEST_DATABASE_URL` trỏ tới một database dùng để test (dữ liệu trong đó sẽ bị xóa). Có thể dùng Postgres cục bộ của Prisma:

```bash
cd packages/server && npx prisma dev --name binhtest --detach
```

## Deploy lên Render (miễn phí)

1. **Tạo database:** đăng ký [Neon](https://neon.tech), tạo project (chọn region Singapore), rồi copy **connection string** (dạng `postgresql://...?sslmode=require`).
2. **Tạo web service:** đăng nhập [Render](https://render.com) bằng GitHub, chọn **New → Blueprint**, chọn repo `noway165/binhxapxam`. Render đọc file `render.yaml` và tạo service.
3. **Dán `DATABASE_URL`:** Render sẽ hỏi giá trị `DATABASE_URL`; dán connection string của Neon vào. `JWT_SECRET` được tạo tự động.
4. Đợi build xong (vài phút), rồi mở link dạng `https://binhxapxam.onrender.com` và gửi cho bạn bè.

Mỗi lần push lên nhánh `main`, Render sẽ tự deploy lại. Bảng trong database được tạo và cập nhật tự động (`prisma migrate deploy`) mỗi lần server khởi động.

**Lưu ý về bản miễn phí:**
- Server "ngủ" sau 15 phút không có ai dùng. Lần mở đầu tiên sau đó phải chờ khoảng 30–50 giây.
- Khi server khởi động lại (deploy mới hoặc thức dậy sau khi ngủ), ván đang chơi dở sẽ mất. Lịch sử và điểm của các ván đã xong vẫn còn.
