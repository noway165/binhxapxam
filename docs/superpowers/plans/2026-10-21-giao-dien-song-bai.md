# Giao diện "Sòng bài cổ điển" — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm lại giao diện client theo phong cách sòng bài cổ điển: bàn nỉ xanh có ghế quanh bàn, lá bài SVG thật, khay xếp bài kéo thả, hiệu ứng chia và lật 3D, âm thanh.

**Architecture:**
- Chỉ sửa `packages/client`. Server, socket và `@binh/rules` giữ nguyên.
- Thêm thư viện `motion` cho chuyển động và kéo thả.
- Ảnh bài và âm thanh để tĩnh trong `public/`.
- Logic thuần mới (`seatLayout`, `slotAt`, `sound`) tách thành file riêng để unit test. Component thay thế giữ nguyên props và nhãn chữ của component cũ, để các test cũ chuyển sang dùng được.

**Tech Stack:** React 19, Vite, `motion` (import từ `motion/react`), Vitest + Testing Library, Google Fonts Playfair Display.

**Spec:** `docs/superpowers/specs/2026-10-21-giao-dien-song-bai-design.md`

## Global Constraints

- Mọi chữ hiện cho người dùng bằng tiếng Việt. Các nhãn đã có giữ nguyên chữ: "Binh lủng", "Sập hầm", "Máy xếp", "Tổng kết", "Xong", "Sửa lại", "Xếp theo giá trị", "Xếp theo chất", "Ván mới", "Rời phòng", "Bắt đầu", "Lá úp".
- Token màu:

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

- Assets chỉ dùng nguồn **public domain hoặc CC0**, ghi rõ trong `packages/client/public/ASSETS-LICENSE.md`.
- Ảnh bài: `public/cards/<cardKey>.svg` (52 file, `cardKey` là định dạng của `@binh/rules`, ví dụ `TD`) và `public/cards/back.svg`.
- Âm thanh: `public/sounds/{deal,flip,place,win,fanfare,tick}.(ogg|mp3)`.
- App bọc trong `<MotionConfig reducedMotion="user">`.
- JS bundle sau gzip không quá **200KB**.
- Tắt tiếng lưu trong `localStorage` khóa `binh_muted`; mặc định bật tiếng.
- Commit không có dòng ghi công Claude. Sau mỗi task: `npm test` xanh, rồi commit và `git push`.

## Review Focus

1. **Kéo lá rồi thả ra ngoài khay, hoặc vào khe giữa hai lá:** không đổi chỗ, lá về vị trí cũ. Test ở Task 5 (`slotAt` trả `null` và component không gọi `swap`).
2. **Trình duyệt chặn phát âm thanh** (`audio.play()` bị reject), hoặc `localStorage` ném lỗi: không crash, game chạy bình thường. Test ở Task 3.
3. **Người vào giữa ván (`waitingNext`) hoặc mất kết nối:** ghế vẫn hiện đúng nhãn, không hiện chồng bài úp. Test ở Task 4.
4. **Trang Lịch sử (`animate=false`) và nút "Bỏ qua":** hiện kết quả ngay, không phải chờ hoạt cảnh. Test ở Task 6.
5. **Đang kéo thì server báo hết giờ** (`locked` hoặc ván chuyển sang REVEAL): không được gửi một cách xếp dở dang. Khay chỉ gửi khi bấm "Xong". Test ở Task 5: khi `locked` thì kéo thả không đổi được gì.

## Cấu trúc file (client)

```
public/cards/*.svg  public/sounds/*  public/ASSETS-LICENSE.md
src/styles/theme.css                (thay src/styles.css)
src/cards/PlayingCard.tsx           (thay src/components/CardView.tsx)
src/sound.ts  src/components/SoundToggle.tsx
src/table/seating.ts  src/table/avatar.ts  src/table/Table.tsx  src/table/Seat.tsx  src/table/TimerRing.tsx
src/arrange/slotAt.ts  src/arrange/ArrangeTray.tsx   (thay ArrangeBoard.tsx; arrangeState.ts giữ nguyên)
src/reveal/RevealTable.tsx          (thay src/components/RevealView.tsx)
```

---

### Task 1: Assets (bài SVG + âm thanh) và giấy phép

**Files:** Create `packages/client/public/cards/` (53 file), `packages/client/public/sounds/` (6 file), `packages/client/public/ASSETS-LICENSE.md`. Test `packages/client/test/assets.test.ts`.

**Interfaces:**
- Produces: các URL `/cards/<cardKey>.svg`, `/cards/back.svg` và `/sounds/<name>.<ext>`. Phần mở rộng âm thanh được hằng số `SOUND_EXT` trong Task 3 dùng lại.

- [ ] **Step 1: Viết test thất bại** `assets.test.ts` (môi trường node, đọc thư mục bằng `fs`):
  - Với mọi lá trong `createDeck()`, tồn tại file `public/cards/${cardKey(c)}.svg`.
  - Tồn tại `public/cards/back.svg`.
  - Mỗi tên trong `['deal','flip','place','win','fanfare','tick']` có đúng một file trong `public/sounds/`.
  - `ASSETS-LICENSE.md` có chứa cả chữ "cards" và "sounds".
- [ ] **Step 2:** Chạy `npx vitest run --project client test/assets`. Kỳ vọng: FAIL.
- [ ] **Step 3: Tìm nguồn bài.**
  - Ưu tiên bộ bài vector của Byron Knoll (public domain), lấy từ Wikimedia Commons hoặc repo/npm có kèm tuyên bố public domain.
  - Tải về thư mục tạm trong scratchpad (không tải thẳng vào repo), kiểm tra tuyên bố giấy phép, rồi đổi tên file theo `cardKey` và chép vào `public/cards/`.
  - Nếu bộ bài không có mặt sau, tự vẽ `back.svg`: nền `#7a1f2b`, hoa văn chéo `#932634`, viền kem `--cream`.
  - **Phương án dự phòng:** không tìm được nguồn đạt chuẩn thì sinh 52 SVG bằng script (góc số, chất đúng vị trí, J/Q/K là chữ cái lớn có khung). Ghi Ruling và báo người dùng.
- [ ] **Step 4: Tìm nguồn âm thanh.**
  - Lấy bộ "Casino Audio" của Kenney (CC0) và chọn 6 file gần nghĩa nhất (chia bài, lật bài, đặt lá, chip thắng, fanfare, tích tắc).
  - Nếu bộ đó thiếu fanfare hoặc tick, lấy từ gói CC0 khác của Kenney ("Interface Sounds" hoặc "UI Audio").
  - Mỗi file nhỏ hơn 60KB.
- [ ] **Step 5:** Viết `ASSETS-LICENSE.md`: với mỗi bộ ghi tên, tác giả, URL nguồn, giấy phép và ngày tải.
- [ ] **Step 6:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 7:** Commit `feat(client): card and sound assets`, rồi push.

### Task 2: Theme + `PlayingCard` + `MotionConfig`

**Files:**
- Create: `src/styles/theme.css`, `src/cards/PlayingCard.tsx`
- Modify: `src/main.tsx` (import theme.css), `index.html` (Google Fonts Playfair Display, `subset=vietnamese`), `src/App.tsx` (bọc `MotionConfig`), mọi nơi import `CardView`
- Delete: `src/styles.css`, `src/components/CardView.tsx`
- Test: `test/PlayingCard.test.tsx`

**Interfaces:**
- Produces: `PlayingCard(props: { card: Card; faceDown?: boolean; selected?: boolean; highlight?: boolean; size?: 'sm' | 'md' | 'lg' } & ButtonHTMLAttributes<HTMLButtonElement>)`.
  - Render một `<button class="pcard pcard-<size>">` có chứa `<img src="/cards/<key>.svg" alt="" draggable={false}>`.
  - `aria-label` là `cardKey`. Khi `faceDown`: ảnh `back.svg`, nhãn `"Lá úp"`, và `disabled`.
  - Kích thước: `sm` 40×56, `md` 56×78, `lg` 72×101 (px). Riêng `md`, khi màn hình ≤ 380px, co lại theo `min(56px, 15vw)`.

- [ ] **Step 1:** `npm i -w @binh/client motion`.
- [ ] **Step 2: Viết test thất bại** `PlayingCard.test.tsx`:
  - `render(<PlayingCard card={AS} />)` → nút có nhãn `'AS'`, `img.src` kết thúc bằng `/cards/AS.svg`.
  - `faceDown` → nhãn `'Lá úp'`, ảnh là `/cards/back.svg`, nút bị `disabled`.
  - `selected` → nút có class `selected`.
- [ ] **Step 3:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 4:** Cài đặt `PlayingCard` và `theme.css`.
  - `theme.css` gồm token ở Global Constraints và style chung lấy từ `styles.css` cũ, đổi sang tông mới:
    - nền trang tối `#0e1712`;
    - bảng (`.card-panel`) dùng viền gỗ, chỉ vàng;
    - nút `.primary` màu vàng đồng `--gold` với chữ `--gold-dark`;
    - tiêu đề dùng `Playfair Display`.
  - Thay mọi chỗ dùng `CardView` bằng `PlayingCard`.
- [ ] **Step 5:** Chạy `npm test`. Kỳ vọng: PASS, kể cả các test cũ của `ArrangeBoard` và `RevealView`, vì nhãn giữ nguyên.
- [ ] **Step 6:** Chạy `npx tsc -p packages/client` (không lỗi). Sau đó mở bản dev bằng preview `binh-dev` và kiểm tra bằng mắt: lá bài SVG hiện đúng, font tiêu đề đã đổi.
- [ ] **Step 7:** Commit `feat(client): casino theme and SVG playing cards`, rồi push.

### Task 3: Âm thanh

**Files:** Create `src/sound.ts`, `src/components/SoundToggle.tsx`. Test `test/sound.test.ts`.

**Interfaces:**
- Produces:
  - `type SoundName = 'deal' | 'flip' | 'place' | 'win' | 'fanfare' | 'tick'`
  - `play(name: SoundName): void`
  - `isMuted(): boolean`
  - `setMuted(m: boolean): void`
  - `useMuted(): [boolean, (m: boolean) => void]`
  - `<SoundToggle />`: nút có nhãn `"Tắt tiếng"` khi đang bật tiếng, `"Bật tiếng"` khi đang tắt; icon loa bằng ký tự 🔊 / 🔇.

- [ ] **Step 1: Viết test thất bại** `sound.test.ts`, dùng jsdom và stub `HTMLMediaElement.prototype.play`:
  - Mặc định `isMuted() === false`.
  - `setMuted(true)` → `localStorage.getItem('binh_muted') === '1'`; khi đọc lại (gọi `vi.resetModules()` rồi import lại) vẫn là `true`.
  - `play('flip')` khi đang tắt tiếng → hàm `play` đã stub không được gọi.
  - **(RF2)** `play` đã stub trả `Promise.reject(new Error('NotAllowedError'))` → `play('flip')` không ném lỗi, và không có lỗi chưa xử lý (await một microtask rồi kiểm tra).
  - **(RF2)** `localStorage.getItem` hoặc `setItem` ném lỗi → `isMuted()` trả `false` và `setMuted(true)` không ném lỗi.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
  - Tạo sẵn và cache một `HTMLAudioElement` cho mỗi tiếng.
  - Trước khi phát: `currentTime = 0`, rồi `play().catch(() => {})`.
  - Trạng thái tắt tiếng giữ trong module, kèm danh sách listener cho `useMuted`.
  - `SoundToggle` gắn vào header của `RoomPage`.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Commit `feat(client): sound effects with mute toggle`, rồi push.

### Task 4: Bàn chơi, ghế, đồng hồ vòng

**Files:** Create `src/table/seating.ts`, `src/table/avatar.ts`, `src/table/Table.tsx`, `src/table/Seat.tsx`, `src/table/TimerRing.tsx`. Modify `src/pages/RoomPage.tsx` (WAITING và dải đối thủ lúc ARRANGING dùng `Table`). Test `test/seating.test.ts`, `test/Seat.test.tsx`.

**Interfaces:**
- Consumes: `RoomPlayerView`, `RoomStateView` (`@binh/rules`).
- Produces:
  - `type SeatPosition = 'left' | 'top' | 'right'`
  - `seatLayout(players: RoomPlayerView[], myId: string): { me: RoomPlayerView | null; others: { player: RoomPlayerView; position: SeatPosition }[] }`
    - `others` theo thứ tự trong mảng `players` (thứ tự vào phòng), xoay vòng bắt đầu từ người ngay sau `me`.
    - Gán vị trí theo số đối thủ: 1 → `[top]`; 2 → `[left, right]`; 3 → `[left, top, right]`.
    - Nếu không có `me` trong danh sách thì `me = null` và `others` là toàn bộ `players`.
  - `initials(name: string): string`: 2 ký tự viết hoa. Tên có `_` hoặc khoảng trắng thì lấy chữ đầu của 2 phần đầu (`tester_a` → `TA`, `lam` → `LA`).
  - `avatarColor(name: string): string`: một trong 8 màu cố định, chọn theo băm tên.
  - `<Table room myId center?: ReactNode compact?: boolean>`: bàn bầu dục và các ghế; `compact` là dải mỏng dùng lúc xếp bài.
  - `<Seat player position: SeatPosition | 'bottom' showBacks: boolean>`
  - `<TimerRing deadline: number totalSec: number>`: hiện số giây còn lại; class `urgent` khi ≤ 10 giây; phát `tick` mỗi giây khi ≤ 10 giây.

- [ ] **Step 1: Viết test thất bại:**
  - `seating.test.ts`:
    - 2 người, tôi là người thứ 2 → `others` gồm người 1 ở `top`.
    - 4 người, tôi là người thứ 2 → `others` lần lượt người 3 `left`, người 4 `top`, người 1 `right`.
    - 3 người → `left` và `right`.
    - `myId` không có trong danh sách → `me === null`, `others.length === players.length`.
    - `initials('tester_a') === 'TA'`, `initials('lam') === 'LA'`.
    - `avatarColor('lam')` cho cùng kết quả qua 2 lần gọi và thuộc bảng 8 màu.
  - `Seat.test.tsx`:
    - Trạng thái `submitted` với `showBacks` → có chữ `"Xong"` và các phần tử có nhãn `"Lá úp"`.
    - **(RF3)** `waitingNext` → có chữ `"Chờ ván sau"` và không có `"Lá úp"`.
    - **(RF3)** `connected:false` → có chữ `"Mất kết nối"`.
    - `isHost` → có phần tử nhãn `"Chủ phòng"`.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
  - Bàn: CSS bầu dục `border-radius: 50%/40%`, nền `--felt` có vân nhẹ (radial-gradient), viền gỗ 10px `--wood`, chỉ vàng 1px bên trong.
  - Ghế đặt tuyệt đối theo vị trí, ghế của bạn ở cạnh dưới.
  - Ở WAITING, mỗi ghế trống hiện nút "Mời bạn" để sao chép link phòng (giống "Sao chép link"). Bảng điều khiển (thời gian, Bắt đầu) nằm dưới bàn.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Kiểm tra thủ công bằng preview cùng `devBot` (2 và 3 người): vị trí ghế, vương miện chủ phòng, đồng hồ vòng, khổ 375px.
- [ ] **Step 6:** Commit `feat(client): poker table with seats and timer ring`, rồi push.

### Task 5: Khay xếp bài kéo thả + hiệu ứng chia bài

**Files:** Create `src/arrange/slotAt.ts`, `src/arrange/ArrangeTray.tsx`. Delete `src/arrange/ArrangeBoard.tsx`. Modify `RoomPage.tsx`. Test `test/slotAt.test.ts`, đổi tên `test/ArrangeBoard.test.tsx` thành `test/ArrangeTray.test.tsx`.

**Interfaces:**
- Consumes: `arrangeState.ts` (`initialSlots`, `swap`, `toArrangement`, `fromArrangement`, `sortWithinChis`, `CHI_RANGES`), `PlayingCard`, `play`.
- Produces:
  - `slotAt(point: { x: number; y: number }, rects: { left: number; top: number; right: number; bottom: number }[]): number | null`: trả chỉ số rect đầu tiên chứa điểm (tính cả biên); không có thì `null`.
  - `<ArrangeTray cards initial locked onSubmit onUnsubmit>`: props giống hệt `ArrangeBoard` cũ, giữ `data-testid="slot-<i>"` và `data-testid="chi<n>-name"`.

- [ ] **Step 1: Viết test thất bại:**
  - `slotAt.test.ts`:
    - Điểm nằm giữa rect 2 → `2`.
    - Điểm đúng trên mép trái của rect 0 → `0`.
    - **(RF1)** Điểm ở khe giữa hai rect → `null`.
    - Điểm ngoài tất cả các rect → `null`.
    - Mảng rect rỗng → `null`.
  - `ArrangeTray.test.tsx`: giữ nguyên 4 test cũ, chỉ đổi import, và thêm:
    - **(RF1)** Gọi trực tiếp handler thả kéo (export `dropAt(from, point)` từ một hook nội bộ hoặc dùng `fireEvent.pointer*`) với điểm ngoài khay → thứ tự `slot-*` không đổi.
    - **(RF5)** Khi `locked`, kéo `slot-0` thả lên vị trí `slot-12` → không đổi chỗ.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt `ArrangeTray`.
  - Mỗi lá bọc trong `motion.div` có `layout` và `drag`, với `dragSnapToOrigin`, `whileDrag={{ scale: 1.08, zIndex: 10 }}`.
  - `onDragEnd(_, info)` tính `slotAt(info.point, rects)` từ `getBoundingClientRect()` của các ô (tọa độ `info.point` là tọa độ trang, nên trừ `window.scrollX/Y`). Có kết quả khác ô nguồn thì `swap` và phát `place`.
  - Chạm hai lá để đổi vẫn giữ như cũ.
  - Lá cỡ `md`; hàng 5 lá vừa 360px.
  - Khi `locked`: `drag={false}` và các lá mờ còn `opacity: 0.85`.
- [ ] **Step 4: Hiệu ứng chia bài** trong `RoomPage` khi có `dealt` mới (key là `deadline`):
  - Mỗi lá xuất hiện với `initial={{ y: -240, opacity: 0, rotate: -10 }}` rồi về vị trí, delay `i * 0.03` giây; phát `deal` một lần lúc bắt đầu.
  - Sau đó lật ngửa: `rotateY` từ 180 về 0, phát `flip`.
  - Reconnect (dealt có sẵn `submitted`) thì không chạy hiệu ứng chia.
- [ ] **Step 5:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 6:** Kiểm tra thủ công ở khổ 375px với `devBot`:
  - kéo thả một lá sang chi khác, thấy lá kia trượt về;
  - thả ra ngoài thì lá bay về chỗ cũ;
  - tạo lủng rồi sửa;
  - bấm Xong thì khay bị khóa.
- [ ] **Step 7:** Commit `feat(client): drag-and-drop arrange tray with deal animation`, rồi push.

### Task 6: Lật bài trên bàn

**Files:** Create `src/reveal/RevealTable.tsx`. Delete `src/components/RevealView.tsx`. Modify `RoomPage.tsx`, `pages/GameDetail.tsx`. Đổi tên `test/RevealView.test.tsx` thành `test/RevealTable.test.tsx`.

**Interfaces:**
- Consumes: `seatLayout`, `PlayingCard`, `play`, `compareHands`, `catName`, `specialName`, `evaluate`.
- Produces: `<RevealTable result: GameResultPayload | GameDetail animate: boolean myUserId?: string>`.
  - Nhịp lật giữ như cũ: mỗi bước `STEP_MS = 1500` ms.
  - Giữ các nhãn và `data-testid="row-<userId>-chi<n>"` (có class `best`), cùng tiêu đề "Tổng kết".

- [ ] **Step 1: Viết test thất bại** `RevealTable.test.tsx`: giữ nguyên 5 test cũ (thứ tự lật, các nhãn, tô sáng chi mạnh nhất, `animate={false}`), chỉ đổi import, và thêm:
  - **(RF4)** Khi `animate`, có nút `"Bỏ qua"`. Bấm vào → không còn lá úp nào và có "Tổng kết" ngay, không cần chờ đồng hồ.
  - **(RF4)** Khi `animate={false}` thì không có nút `"Bỏ qua"`.
  - Có cặp `sapHam` → hiện banner chữ `"SẬP HẦM"`. Có người thắng trắng → banner `"THẮNG TRẮNG"`.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
  - Mỗi người hiện 3 hàng bài cỡ `sm` ở vị trí ghế của họ, dùng `seatLayout`; trên điện thoại xếp thành lưới 2 cột.
  - Mỗi lá lật bằng `motion` với `rotateY` từ 180 về 0 khi tới bước của chi đó; mỗi bước phát `flip` một lần.
  - Sau mỗi chi, hiện "+N" bay lên (`y: 0 → -24`, mờ dần) trên ghế đối thủ:
    - N là giá trị chi người đó thắng bạn (đọc từ `pairs` và `chiValue` của bên thắng);
    - phát `win` nếu bạn thắng chi đó.
  - Banner giữa bàn (`AnimatePresence`, `scale: 0.6 → 1`) xuất hiện ở bước cuối:
    - có cặp sập hầm liên quan tới bạn → "SẬP HẦM";
    - có người thắng trắng → "THẮNG TRẮNG — <tên loại>", phát `fanfare`;
    - bạn bị lủng → "BINH LỦNG".
  - Điểm ván chạy số từ 0 tới giá trị cuối trong 800ms (dùng `animate()` của `motion`).
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Kiểm tra thủ công: lật bài 2 và 3 người, banner, nút Bỏ qua, trang Lịch sử hiện kết quả ngay.
- [ ] **Step 6:** Commit `feat(client): animated reveal on the table`, rồi push.

### Task 7: Áp theme cho các trang còn lại + kiểm tra tổng

**Files:** Modify `src/pages/Login.tsx`, `Lobby.tsx`, `History.tsx`, `GameDetail.tsx`, `Leaderboard.tsx`, `src/styles/theme.css`.

- [ ] **Step 1:** Chỉnh giao diện các trang (chỉ markup và class, không đổi logic):
  - **Login:** logo chữ "Binh Xập Xám" dùng Playfair Display màu vàng, kèm 4 ký hiệu chất ♠♥♦♣; bảng gỗ.
  - **Lobby:** bảng gỗ, avatar của bạn (`initials` / `avatarColor`), nút "Tạo phòng" vàng.
  - **Lịch sử / Bảng xếp hạng:** danh sách dạng hàng trên nền gỗ tối; top 3 bảng xếp hạng có huy chương 🥇🥈🥉.
- [ ] **Step 2:** Chạy `npm test` (không đổi so với trước, vì các test login và RoomPage vẫn qua). Kỳ vọng: PASS.
- [ ] **Step 3:** Chạy `npm run build`. Đọc dòng `index-*.js … gzip:` trong output, kỳ vọng nhỏ hơn hoặc bằng 200 kB.
- [ ] **Step 4:** Kiểm tra thủ công trọn ván ở khổ 375px và desktop với `devBot`:
  - đăng nhập, sảnh, phòng chờ, chia bài, kéo thả, nộp, lật, Ván mới;
  - Lịch sử, Bảng xếp hạng;
  - tắt và bật tiếng;
  - giả lập `prefers-reduced-motion: reduce` (DevTools hoặc `matchMedia`): hiệu ứng di chuyển bị tắt mà game vẫn chơi được.
- [ ] **Step 5:** Commit `feat(client): casino theme for lobby, auth, history and leaderboard`, rồi push.
