# Binh Xập Xám Online — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game Binh Xập Xám chơi online trên web, 2–4 người mỗi phòng, có tài khoản, lịch sử và bảng xếp hạng, deploy được lên Render + Neon.

**Architecture:** Monorepo npm workspaces gồm 3 package TypeScript:
- `@binh/rules`: luật chơi thuần, không phụ thuộc gì, cộng với các kiểu dữ liệu giao tiếp (protocol) giữa client và server.
- `@binh/server`: Express + Socket.IO. Logic phòng chơi viết thành class thuần, test bằng fake timers. Lưu trữ đi qua interface `Store`, có hai bản cài đặt: Memory (dùng cho test và dev) và Prisma (dùng cho production).
- `@binh/client`: React + Vite, import trực tiếp `@binh/rules` để hiện loại bài và cảnh báo lủng.

**Tech Stack:** Node 24, TypeScript (strict), Vitest, Express, Socket.IO, Prisma + PostgreSQL (Neon), bcryptjs, jsonwebtoken, zod, React, React Router, Vite, @testing-library/react, tsx (chạy TypeScript trực tiếp ở cả dev lẫn production).

**Spec:** `docs/superpowers/specs/2026-10-20-binh-xap-xam-design.md`. Đọc spec trước khi làm bất kỳ task nào; phần luật nằm ở mục 3 của spec.

## Global Constraints

- TypeScript `strict: true` ở mọi package. Package `@binh/rules` có `main` trỏ thẳng vào `src/index.ts`, không có bước build. Server chạy bằng `tsx`, client để Vite tự xử lý TypeScript.
- Không dùng dependency cần biên dịch native, để `npm ci` chạy được trên Windows và trên Render. Ví dụ: dùng `bcryptjs`, không dùng `bcrypt`.
- Mọi chữ hiện cho người dùng (giao diện, thông báo lỗi) đều bằng **tiếng Việt**.
- Thời gian xếp bài: tối thiểu 30 giây, tối đa 300 giây, mặc định 90 giây. Phòng tối đa 4 người, cần ít nhất 2 người để bắt đầu. Phòng không còn ai kết nối quá 10 phút thì bị xóa.
- Mã phòng gồm 6 ký tự lấy từ bảng `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (đã bỏ các ký tự dễ nhầm).
- Username: 3–20 ký tự `[a-zA-Z0-9_]`, duy nhất **không phân biệt hoa thường**. Mật khẩu tối thiểu 6 ký tự.
- Cookie phiên đăng nhập tên `binh_token`, là JWT `{ uid, username }`, cờ `httpOnly`, `SameSite=Lax`, `Secure` khi `NODE_ENV=production`, hạn 30 ngày.
- Commit message **không** có dòng `Co-Authored-By` hay bất kỳ dòng ghi công Claude nào. Sau mỗi task: `git push`.
- Lệnh test chung: `npm test` ở thư mục gốc (Vitest với `projects`). Mỗi task chỉ được coi là xong khi toàn bộ `npm test` xanh.

## Review Focus

1. **Nộp bài không hợp lệ:** lá trùng, lá không có trong bài được chia, hoặc sai số lá ở mỗi chi (5/5/3). Server phải từ chối kèm thông báo, trạng thái giữ nguyên. Test ở Task 9.
2. **Hết giờ trùng đúng lúc người cuối cùng nộp bài:** ván chỉ được chấm và lưu **một lần**. Test ở Task 9.
3. **F5 hoặc vào lại sau khi đã nộp bài:** người chơi nhận lại bài, `deadline`, cách xếp đã nộp, và trạng thái "Xong". Test ở Task 9 (`snapshotFor`) và Task 10 (qua socket).
4. **Chủ phòng rời đi giữa ván:** bài của chủ phòng vẫn được chấm. Quyền chủ phòng chuyển cho người vào sớm nhất, và người đó bấm được "Ván mới". Test ở Task 9.
5. **Username trùng khác hoa thường** (`Lam` và `lam`): đăng ký lần hai bị từ chối, đăng nhập bằng kiểu chữ nào cũng được. Test ở Task 7.

## Cấu trúc file

```
package.json                  workspaces, scripts: test, dev, build, start
tsconfig.base.json
vitest.config.ts              projects: packages/*
render.yaml
README.md                     hướng dẫn chạy local + deploy (tiếng Việt)
packages/rules/src/
  types.ts        Card, Suit, Rank, Cat, HandValue, Arrangement, SpecialKind
  cards.ts        createDeck, shuffle, deal, mulberry32, parseCards (helper cho test)
  evaluate.ts     evaluate(cards) → HandValue
  compare.ts      compareHands, foulReason, isFoul
  splits.ts       forEachSplit (duyệt 72.072 cách chia 5-5-3 bằng bitmask)
  special.ts      detectSpecial
  scoring.ts      chiValue, scorePair, scoreRound
  autoArrange.ts  autoArrange
  names.ts        tên tiếng Việt của loại bài / thắng trắng
  protocol.ts     kiểu payload socket + REST dùng chung
  index.ts
packages/server/
  prisma/schema.prisma
  src/config.ts  src/app.ts  src/index.ts
  src/store/types.ts  memoryStore.ts  prismaStore.ts  store.contract.ts
  src/auth/password.ts  jwt.ts  routes.ts
  src/api/routes.ts             history, games/:id, leaderboard
  src/game/Room.ts  RoomError.ts  RoomManager.ts  validate.ts
  src/socket.ts
packages/client/src/
  main.tsx  App.tsx  api.ts  socket.ts  auth.tsx  toast.tsx  styles.css
  arrange/arrangeState.ts  arrange/ArrangeBoard.tsx
  components/CardView.tsx  Timer.tsx  RevealView.tsx
  pages/Login.tsx  Lobby.tsx  RoomPage.tsx  History.tsx  GameDetail.tsx  Leaderboard.tsx
```

Lệch nhỏ so với spec:
- Kết quả so từng cặp (`pairs`) được lưu một lần ở bảng `Game` thay vì lặp lại ở từng `GamePlayer`.
- Không có sự kiện `game:progress` riêng; trạng thái từng người nằm luôn trong `room:state`.
- Lỗi thao tác trả về qua socket ack (`{ ok: false, error }`) thay vì sự kiện `error`.

---

### Task 1: Khung monorepo + bộ bài

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `packages/rules/package.json`, `packages/rules/tsconfig.json`, `packages/rules/src/types.ts`, `packages/rules/src/cards.ts`, `packages/rules/src/index.ts`
- Test: `packages/rules/test/cards.test.ts`

**Interfaces:**
- Produces:
  - `type Suit = 'S'|'H'|'D'|'C'`, `type Rank = 2|3|…|14`, `interface Card { rank: Rank; suit: Suit }`
  - `enum Cat { MauThau=0, Doi=1, Thu=2, Xam=3, Sanh=4, Thung=5, CuLu=6, TuQuy=7, ThungPhaSanh=8 }`
  - `interface HandValue { cat: Cat; tiebreak: number[] }`
  - `interface Arrangement { chi1: Card[]; chi2: Card[]; chi3: Card[] }`
  - `type SpecialKind = 'SANH_RONG'|'LUC_PHE_BON'|'BA_THUNG'|'BA_SANH'`
  - `createDeck(): Card[]` (52 lá)
  - `shuffle(cards: Card[], rng?: () => number): Card[]` (Fisher–Yates, trả về mảng mới; `rng` mặc định dựa trên `crypto.getRandomValues`)
  - `deal(numPlayers: number, rng?): Card[][]` (13 lá mỗi người, chấp nhận 2–4 người)
  - `mulberry32(seed: number): () => number`
  - `parseCards(s: string): Card[]`: định dạng `"AS KH TD 2C"`, ký tự giá trị `2-9 T J Q K A`
  - `cardKey(c: Card): string` → `"AS"`

- [ ] **Step 1:** Tạo `package.json` gốc với `"private": true`, `"workspaces": ["packages/*"]`, script `"test": "vitest run"`. Tạo `tsconfig.base.json` (strict, `module`/`moduleResolution: "Bundler"`, `target: ES2022`, `skipLibCheck`). Tạo `vitest.config.ts` với `test.projects: ['packages/*']`. Package rules có tên `@binh/rules`, `"main": "src/index.ts"`, `"type": "module"`. Chạy `npm i -D typescript vitest` ở gốc.
- [ ] **Step 2: Viết test thất bại** `cards.test.ts`:
  - `createDeck()` có độ dài 52, gồm 52 `cardKey` khác nhau.
  - `deal(4, mulberry32(1))` trả về 4 tay × 13 lá, không lá nào trùng trên cả 4 tay.
  - `deal(5)` và `deal(1)` đều throw.
  - Cùng seed thì `deal` cho kết quả giống hệt nhau.
  - `parseCards("AS TD 2C")` bằng `[{rank:14,suit:'S'},{rank:10,suit:'D'},{rank:2,suit:'C'}]`.
- [ ] **Step 3:** Chạy `npx vitest run packages/rules`. Kỳ vọng: FAIL (module chưa có).
- [ ] **Step 4:** Cài đặt `types.ts`, `cards.ts`, `index.ts` (export tất cả).
- [ ] **Step 5:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 6:** Commit `chore: monorepo scaffold and card deck`, rồi push.

### Task 2: Nhận diện loại bài (`evaluate`) + tên tiếng Việt

**Files:** Create `packages/rules/src/evaluate.ts`, `packages/rules/src/names.ts`. Test `packages/rules/test/evaluate.test.ts`.

**Interfaces:**
- Consumes: `Card`, `Cat`, `HandValue`, `parseCards` (Task 1).
- Produces:
  - `evaluate(cards: Card[]): HandValue`: chỉ nhận 3 hoặc 5 lá, số lá khác thì throw.
  - `catName(cat: Cat): string`: `Thùng phá sảnh, Tứ quý, Cù lũ, Thùng, Sảnh, Xám cô, Thú, Đôi, Mậu thầu`
  - `specialName(k: SpecialKind): string`: `Sảnh rồng, Lục phé bôn, 3 thùng, 3 sảnh`

- [ ] **Step 1: Viết test thất bại** dạng bảng `parseCards(input)` → `{cat, tiebreak}`:

| input | cat | tiebreak |
|---|---|---|
| `AS KS QS JS TS` | ThungPhaSanh | `[14]` |
| `5H 4H 3H 2H AH` | ThungPhaSanh | `[5]` |
| `9C 9D 9H 9S 2D` | TuQuy | `[9,2]` |
| `KC KD KH 4S 4D` | CuLu | `[13,4]` |
| `2H 7H 9H JH KH` | Thung | `[13,11,9,7,2]` |
| `5H 4D 3S 2C AH` | Sanh | `[5]` |
| `TC JD QH KS AD` | Sanh | `[14]` |
| `QC KD AH 2S 3D` | MauThau | `[14,13,12,3,2]` (không cho sảnh vòng) |
| `7C 7D 7H KS 2D` | Xam | `[7,13,2]` |
| `JC JD 4H 4S AD` | Thu | `[11,4,14]` |
| `8C 8D AH 5S 3D` | Doi | `[8,14,5,3]` |
| `QC QD QH` | Xam | `[12]` |
| `5C 5D KH` | Doi | `[5,13]` |
| `AS KS QS` | MauThau | `[14,13,12]` (chi 3 không có thùng/sảnh) |

  Thêm: `evaluate(parseCards("AS KS QS JS"))` throw; `catName(Cat.CuLu) === 'Cù lũ'`.
- [ ] **Step 2:** Chạy `npx vitest run packages/rules/test/evaluate.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt `evaluate`. Gom lá theo giá trị, sắp các nhóm theo (số lá giảm dần, giá trị giảm dần); tiebreak lấy giá trị các nhóm theo đúng thứ tự đó. Sảnh xét riêng: 5 giá trị khác nhau và liên tiếp, hoặc đúng bộ `{14,2,3,4,5}` thì lá cao nhất là 5. Cài đặt `names.ts`.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Commit `feat(rules): hand evaluation`, rồi push.

### Task 3: So bài và binh lủng

**Files:** Create `packages/rules/src/compare.ts`. Test `packages/rules/test/compare.test.ts`.

**Interfaces:**
- Consumes: `evaluate`, `HandValue`, `Arrangement`.
- Produces:
  - `compareHands(a: HandValue, b: HandValue): number`: dương nếu a mạnh hơn, âm nếu yếu hơn, 0 nếu bằng. So `cat` trước, rồi so `tiebreak` từ trái sang phải **đến hết mảng ngắn hơn** (spec 3.2).
  - `foulReason(a: Arrangement): null | 'CHI2_GT_CHI1' | 'CHI3_GT_CHI2'`
  - `isFoul(a: Arrangement): boolean`
  - `foulMessage(r): string`: `"Binh lủng: Chi 2 mạnh hơn Chi 1"` / `"Binh lủng: Chi 3 mạnh hơn Chi 2"`

- [ ] **Step 1: Viết test thất bại** (`h = s => evaluate(parseCards(s))`):
  - `compareHands(h('2H 7H 9H JH KH'), h('TC JD QH KS AD')) > 0` (Thùng thắng Sảnh)
  - `compareHands(h('KC KD 9H 5S 3D'), h('KH KS 9C 5D 2D')) > 0` (cùng đôi K, so lá lẻ)
  - `compareHands(h('KC KD 9H 5S 3D'), h('KH KS 9C 5D 3H')) === 0` (khác chất vẫn hòa)
  - `compareHands(h('5H 4D 3S 2C AH'), h('6H 5D 4S 3C 2H')) < 0` (A-2-3-4-5 là sảnh nhỏ nhất)
  - 5 lá so với 3 lá: `compareHands(h('KC 9D 7H 4S 3D'), h('KH 9S 8C')) < 0`; `compareHands(h('KC 9D 8H 4S 3D'), h('KH 9S 8C')) === 0`; `compareHands(h('7C 7D 7H KS 2D'), h('9C 9D 9H')) < 0`
  - `foulReason({chi1: Đôi, chi2: Thú, chi3: Mậu thầu})` là `'CHI2_GT_CHI1'`
  - `foulReason({chi1: Thú, chi2: Đôi 8, chi3: Đôi Q})` là `'CHI3_GT_CHI2'`
  - Cách xếp hợp lệ thì `foulReason` trả về `null`. Chi 2 và chi 3 bằng nhau theo luật so mảng ngắn thì **không** lủng.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt `compare.ts`.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Commit `feat(rules): hand comparison and foul check`, rồi push.

### Task 4: Duyệt cách chia + thắng trắng

**Files:** Create `packages/rules/src/splits.ts`, `packages/rules/src/special.ts`. Test `packages/rules/test/special.test.ts`.

**Interfaces:**
- Produces:
  - `forEachSplit(cards: Card[], fn: (chi1: Card[], chi2: Card[], chi3: Card[]) => boolean | void): void`: duyệt đủ C(13,5)·C(8,5) = 72.072 cách chia; callback trả `true` thì dừng sớm. Dùng bitmask 13 bit để sinh tổ hợp.
  - `detectSpecial(cards13: Card[]): SpecialKind | null`: kiểm tra theo thứ tự SANH_RONG, LUC_PHE_BON, BA_THUNG, BA_SANH và trả về loại đầu tiên khớp.

- [ ] **Step 1: Viết test thất bại:**
  - Đếm số lần gọi callback của `forEachSplit` trên 13 lá bất kỳ bằng 72072.
  - `SANH_RONG`: `2S 3H 4D 5C 6S 7H 8D 9C TS JH QD KC AS`
  - `LUC_PHE_BON`:
    - `2S 2H 4D 4C 6S 6H 8D 8C TS TH QD QC AS` (6 đôi)
    - `3S 3H 3D 4C 4S 5H 5D 6C 6S 7H 7D 8C 8S` (1 xám + 5 đôi)
    - `9S 9H 9D 9C 2S 2H 4D 4C 6S 6H 8D 8C KS` (tứ quý + 4 đôi = 6 đôi)
    - `9S 9H 9D 9C 2S 2H 4D 4C 6S 6H KD AC 7S` (tứ quý + 3 đôi = 5 đôi, **không** đủ) → `null`
  - `BA_THUNG`: `2H 4H 6H 8H TH 3S 5S 7S 9S JS 2C QC KC` → `'BA_THUNG'`
  - `BA_SANH`:
    - `2S 3H 4D 5C 6S 8H 9D TC JS QH QD KC AS` (2-6, 8-Q, Q-K-A) → `'BA_SANH'`
    - `AH 2C 3S 5D 6H 7C 8S 9D TH JC QS KD 9C` (chi 3 là A-2-3, cùng 5-9 và 9-K) → `'BA_SANH'`
  - Bài thường `2S 2H 5D 7C 9S JH KD 4C 6S 8H TD QC AS` → `null`
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
  - Lục phé bôn: tổng `floor(số lá cùng giá trị / 2)` từ 6 trở lên.
  - 3 thùng / 3 sảnh: dùng `forEachSplit` với điều kiện kiểm tra riêng. Chi 3 coi là thùng khi 3 lá đồng chất; coi là sảnh khi 3 giá trị liên tiếp, hoặc đúng bộ `{14,2,3}`.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Commit `feat(rules): instant-win detection`, rồi push.

### Task 5: Tính điểm

**Files:** Create `packages/rules/src/scoring.ts`. Test `packages/rules/test/scoring.test.ts`.

**Interfaces:**
- Consumes: `evaluate`, `compareHands`, `isFoul`, `detectSpecial`.
- Produces:
  - `chiValue(chi: 1|2|3, h: HandValue): number`: theo bảng ở spec 3.5. Chi 1: TPS 5, Tứ quý 4, còn lại 1. Chi 2: TPS 10, Tứ quý 8, Cù lũ 2, còn lại 1. Chi 3: Xám 3, còn lại 1.
  - `interface PlayerInput { id: string; arrangement: Arrangement }`
  - `interface PlayerOutcome { id: string; hands: [HandValue, HandValue, HandValue]; foul: boolean; special: SpecialKind | null; score: number }`
  - `interface PairResult { a: string; b: string; chi: [number, number, number] | null; sapHam: boolean; net: number }`: `chi[i]` mang dấu của `compareHands` nhìn từ phía `a` (−1, 0 hoặc 1); bằng `null` khi cặp này được quyết định bởi thắng trắng hoặc lủng. `net` tính từ phía `a`.
  - `scoreRound(players: PlayerInput[]): { players: PlayerOutcome[]; pairs: PairResult[] }`: mỗi cặp không thứ tự xuất hiện đúng một lần. Thắng trắng được phát hiện trên `chi1 ∪ chi2 ∪ chi3`.

- [ ] **Step 1: Viết test thất bại** (luôn kiểm tra thêm tổng `score` bằng 0):
  - A thắng chi 1 và chi 3, thua chi 2 (các bài thường) → `net(A,B) = +1`, `sapHam: false`.
  - A thắng cả 3 chi bằng bài thường → `+6`, `sapHam: true`.
  - A có tứ quý ở chi 1 và thắng cả 3 chi → `(4+1+1)×2 = +12`.
  - B có cù lũ ở chi 2 thắng chi 2 của A, A thắng chi 1 và chi 3 → `1 − 2 + 1 = 0`.
  - A thắng 2 chi, hòa 1 chi → `+2`, không sập hầm.
  - Chỉ B lủng, A có xám ở chi 3 → `net = (1+1+3)×2 = 10`, `chi: null`.
  - Cả hai cùng lủng → `0`.
  - A thắng trắng (3 thùng), B bài thường hoặc lủng → `+6`. Cả hai cùng thắng trắng → `0`. Người thắng trắng có `foul: false` dù cách xếp bị lủng.
  - Bàn 4 người: `pairs.length === 6`, tổng điểm bằng 0, và `score` của mỗi người bằng tổng `net` (đã đổi dấu đúng chiều) của những cặp có mặt người đó.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Commit `feat(rules): round scoring`, rồi push.

### Task 6: Tự xếp bài

**Files:** Create `packages/rules/src/autoArrange.ts`. Test `packages/rules/test/autoArrange.test.ts`.

**Interfaces:**
- Produces: `autoArrange(cards13: Card[]): Arrangement`

- [ ] **Step 1: Viết test thất bại:**
  - Với 200 tay bài sinh từ `deal(4, mulberry32(seed))`: kết quả dùng đúng 13 lá đầu vào và `isFoul(result) === false`.
  - Bài có `AS AH AD AC` → `evaluate(result.chi1).cat >= Cat.TuQuy`.
  - Một lần gọi chạy dưới 200ms (đo `performance.now()` trên 20 lần gọi, lấy trung bình).
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
  - Duyệt bằng `forEachSplit`. Lưu kết quả `evaluate` vào cache theo bitmask của tập lá: chỉ có 1287 tập 5 lá và 286 tập 3 lá khác nhau.
  - Bỏ các cách chia lủng. Chọn cách có `cat1+cat2+cat3` lớn nhất; nếu bằng thì so `compareHands` lần lượt ở chi 1, rồi chi 2, rồi chi 3.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Commit `feat(rules): auto arrange`, rồi push.

### Task 7: Server, Store và xác thực

**Files:**
- Create: `packages/server/package.json` (`@binh/server`, phụ thuộc `@binh/rules: "*"`), `tsconfig.json`, `src/config.ts`, `src/store/types.ts`, `src/store/memoryStore.ts`, `src/store/store.contract.ts`, `src/auth/password.ts`, `src/auth/jwt.ts`, `src/auth/routes.ts`, `src/app.ts`
- Test: `packages/server/test/memoryStore.test.ts`, `packages/server/test/auth.test.ts`

**Interfaces:**
- Produces:
  - `interface UserRecord { id: string; username: string; passwordHash: string; totalScore: number; gamesPlayed: number }`
  - `interface SavedGame { roomCode: string; timeLimitSec: number; startedAt: Date; endedAt: Date; players: { userId: string; cards: Card[]; arrangement: Arrangement; autoArranged: boolean; foul: boolean; special: SpecialKind | null; score: number }[]; pairs: PairResult[] }`
  - `interface Store`:
    - `createUser(username, passwordHash): Promise<UserRecord>`: throw `UsernameTakenError` khi trùng tên, không phân biệt hoa thường.
    - `findUserByUsername(username)`: không phân biệt hoa thường.
    - `findUserById(id)`
    - `saveGame(g: SavedGame): Promise<string>`: trả về gameId và cộng `totalScore`/`gamesPlayed` của từng người, tất cả trong một thao tác nguyên tử.
    - `listGamesForUser(userId, limit): Promise<GameSummary[]>`: mới nhất trước.
    - `getGame(id): Promise<GameDetail | null>`
    - `leaderboard(limit): Promise<LeaderboardRow[]>`: sắp theo `totalScore` giảm dần.
  - `GameSummary`, `GameDetail`, `LeaderboardRow`, `MeResponse` khai báo trong `packages/rules/src/protocol.ts`:
    - `GameSummary { id; endedAt: string; myScore: number; players: { username; score }[] }`
    - `GameDetail { id; endedAt; players: { userId; username; arrangement; foul; special; autoArranged; score }[]; pairs: PairResult[] }`
    - `LeaderboardRow { username; totalScore; gamesPlayed }`
    - `MeResponse { id; username; totalScore; gamesPlayed }`
  - `runStoreContract(name: string, make: () => Promise<Store>)`: bộ test dùng chung cho mọi bản cài đặt Store.
  - `createApp({ store, jwtSecret, secureCookies }): express.Express`
  - `verifyToken(token, secret): { uid: string; username: string } | null`
  - REST:
    - `POST /api/register {username, password}` → 201 + cookie
    - `POST /api/login` → 200 + cookie
    - `POST /api/logout`
    - `GET /api/me` → `MeResponse` hoặc 401
  - Lỗi trả về dạng `{ error: string }` tiếng Việt: `"Tên đăng nhập đã tồn tại"`, `"Sai tên đăng nhập hoặc mật khẩu"`, `"Tên đăng nhập 3–20 ký tự: chữ, số, _"`, `"Mật khẩu tối thiểu 6 ký tự"`.

- [ ] **Step 1:** Cài các package: `express cookie-parser jsonwebtoken bcryptjs zod express-rate-limit`, cùng devDeps `tsx supertest @types/*`.
- [ ] **Step 2: Viết test thất bại:**
  - `runStoreContract('memory', …)`:
    - Tạo user xong tìm lại được.
    - Tạo `Lam` rồi tạo `lam` → `UsernameTakenError`.
    - `saveGame` 2 người với điểm +6/−6 → `totalScore` lần lượt 6 và −6, `gamesPlayed` đều bằng 1.
    - `listGamesForUser` trả về ván đó kèm `myScore` đúng.
    - `getGame` có đủ `pairs`.
    - `leaderboard` sắp đúng thứ tự.
  - `auth.test.ts` (dùng supertest agent):
    - Đăng ký thành công thì có cookie `binh_token`, và `/api/me` trả đúng username.
    - Đăng ký `Lam` lần hai bằng `lam` → 409.
    - Đăng nhập bằng `LAM` với mật khẩu đúng → 200.
    - Sai mật khẩu → 401.
    - Username `ab` → 400; mật khẩu `12345` → 400.
    - Logout xong `/api/me` → 401.
    - Sai mật khẩu 11 lần trong một phút → lần thứ 11 trả 429.
- [ ] **Step 3:** Chạy `npx vitest run packages/server`. Kỳ vọng: FAIL.
- [ ] **Step 4:** Cài đặt. Hệ số băm bcrypt là 10. Rate limit gắn vào `/api/login` với giới hạn 10 lần mỗi phút.
- [ ] **Step 5:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 6:** Commit `feat(server): store abstraction and auth`, rồi push.

### Task 8: Prisma Store

**Files:** Create `packages/server/prisma/schema.prisma`, `packages/server/src/store/prismaStore.ts`, `packages/server/src/db.ts`. Test `packages/server/test/prismaStore.test.ts`.

**Interfaces:**
- Consumes: `Store`, `runStoreContract` (Task 7).
- Produces: `createPrismaStore(databaseUrl: string): Store`

- [ ] **Step 1:** Cài `prisma` và `@prisma/client`, rồi làm theo hướng dẫn của phiên bản Prisma đang dùng (generator, output, config). Viết schema:
  - `User { id String @id @default(cuid()), username String, usernameLower String @unique, passwordHash String, totalScore Int @default(0), gamesPlayed Int @default(0), createdAt DateTime @default(now()) }`
  - `Game { id String @id @default(cuid()), roomCode String, timeLimitSec Int, startedAt DateTime, endedAt DateTime, pairs Json, players GamePlayer[] }`
  - `GamePlayer { id, gameId, userId, cards Json, chi1 Json, chi2 Json, chi3 Json, autoArranged Boolean, foul Boolean, special String?, score Int }`, đánh index trên `userId` và `gameId`.
- [ ] **Step 2: Viết test** `prismaStore.test.ts`: gọi `runStoreContract('prisma', …)` bên trong `describe.skipIf(!process.env.TEST_DATABASE_URL)`. Trước mỗi test, xóa sạch các bảng.
- [ ] **Step 3:** Cài đặt. `saveGame` dùng `prisma.$transaction`: tạo Game và các GamePlayer, đồng thời `update … increment` cho từng User.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS (test Prisma được bỏ qua nếu không có `TEST_DATABASE_URL`). Nếu đã có database Neon dành cho test, chạy `npx prisma migrate dev` rồi chạy lại với biến đó, kỳ vọng PASS cả phần Prisma.
- [ ] **Step 5:** Commit `feat(server): prisma store`, rồi push.

### Task 9: Logic phòng (`Room`)

**Files:** Create `packages/server/src/game/Room.ts`, `RoomError.ts`, `validate.ts`, và thêm phần protocol vào `packages/rules/src/protocol.ts`. Test `packages/server/test/room.test.ts`.

**Interfaces:**
- Consumes: `deal`, `autoArrange`, `scoreRound`, `SavedGame`.
- Produces (protocol):
  - `type RoomPhase = 'WAITING'|'ARRANGING'|'REVEAL'`
  - `interface RoomPlayerView { userId; username; isHost: boolean; connected: boolean; status: 'idle'|'arranging'|'submitted'|'waitingNext'; roomScore: number }`
  - `interface RoomStateView { code; phase: RoomPhase; timeLimitSec; deadline: number | null; players: RoomPlayerView[] }`
  - `interface DealtPayload { cards: Card[]; deadline: number; submitted: Arrangement | null }`
  - `interface GameResultPayload { gameId: string | null; players: { userId; username; arrangement; hands: HandValue[]; foul; special; autoArranged; score; roomScore }[]; pairs: PairResult[] }`
- Produces (server):
  - `class RoomError extends Error`
  - `validateArrangement(dealt: Card[], a: Arrangement): string | null`: trả về thông báo lỗi, hoặc `null` nếu hợp lệ.
  - `interface RoomSink { state(v: RoomStateView): void; dealt(userId: string, p: DealtPayload): void; result(r: GameResultPayload): void }`
  - `class Room`:
    - `constructor(code: string, sink: RoomSink, saveGame: (g: SavedGame) => Promise<string>)`
    - `join(user: {id, username})`, `leave(userId)`, `setConnected(userId, bool)`
    - `setTimeLimit(userId, sec)`, `start(userId)`, `submit(userId, a)`, `unsubmit(userId)`, `next(userId)`
    - `snapshotFor(userId): { state: RoomStateView; dealt: DealtPayload | null; result: GameResultPayload | null }`
    - Getter `isEmptyOfConnected: boolean`, `playerCount: number`, `has(userId)`
    - Mọi lỗi thao tác đều throw `RoomError` với nội dung tiếng Việt.

- [ ] **Step 1: Viết test thất bại** (dùng `vi.useFakeTimers()`, một `sink` giả ghi lại mọi lần gọi, và `saveGame` giả):
  - `start` khi chỉ có 1 người → throw `"Cần ít nhất 2 người"`. Người không phải chủ phòng gọi `start` → throw `"Chỉ chủ phòng mới được làm việc này"`.
  - Sau `start` với 3 người: mỗi người nhận `dealt` 13 lá, không lá nào trùng; `deadline` bằng `Date.now() + 90_000`; phase là `ARRANGING`.
  - `setTimeLimit` với 29 hoặc 301 → throw; với 120 → ok; gọi khi đang `ARRANGING` → throw.
  - **(RF1)** `submit` bị từ chối và trạng thái giữ nguyên khi: chi 1 chỉ có 4 lá; có lá trùng; có lá không thuộc bài được chia.
  - Tất cả nộp bài → `result` được gọi đúng 1 lần, phase `REVEAL`, tổng `score` bằng 0, `saveGame` được gọi 1 lần, `gameId` trong kết quả bằng id do `saveGame` trả về.
  - **(RF2)** Tất cả nộp bài, sau đó `vi.advanceTimersByTime(200_000)` → `result` vẫn chỉ được gọi 1 lần.
  - Hết giờ khi 1 người chưa nộp → người đó có `autoArranged: true` và `foul: false`.
  - `unsubmit` sau khi đã nộp, rồi để hết giờ → người đó được tự xếp.
  - **(RF3)** `snapshotFor(B)` sau khi B đã nộp → `dealt.submitted` đúng là cách xếp B đã nộp, `status: 'submitted'`, `deadline` không đổi.
  - **(RF4)** Chủ phòng A gọi `leave` khi đang `ARRANGING` → A vẫn có mặt trong `result`. Sau khi có kết quả, A bị loại khỏi phòng và B thành chủ phòng; B gọi `next()` → ok.
  - Người vào khi đang `ARRANGING` có `status: 'waitingNext'` và không nhận `dealt`; ván sau thì có nhận. Người thứ 5 vào → throw `"Phòng đã đủ 4 người"`.
  - Gọi `next()` khi chỉ còn 1 người → phase `WAITING`.
  - `saveGame` bị reject → vẫn có `result`, với `gameId: null`.
  - `roomScore` được cộng dồn qua 2 ván.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
  - Một hàm `finalize()` duy nhất, có cờ chặn để chỉ chạy một lần mỗi ván. Hàm này hủy timer, gọi `autoArrange` cho ai chưa nộp, rồi `scoreRound` → `await saveGame` (bắt lỗi thì dùng `gameId: null`) → `sink.result` → loại những người đã rời → `sink.state`.
  - Chủ phòng là người có thời điểm vào phòng sớm nhất trong số những người chưa rời.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Commit `feat(server): room game logic`, rồi push.

### Task 10: RoomManager + Socket.IO

**Files:** Create `packages/server/src/game/RoomManager.ts`, `packages/server/src/socket.ts`, `packages/server/src/index.ts`. Thêm vào `app.ts` hàm `createServer`. Test `packages/server/test/roomManager.test.ts`, `packages/server/test/socket.test.ts`.

**Interfaces:**
- Consumes: `Room`, `RoomSink`, `Store.saveGame`, `verifyToken`.
- Produces:
  - `class RoomManager(makeSink: (code) => RoomSink, saveGame)`:
    - `create(user): Room`
    - `join(code, user): Room`: mã không tồn tại thì throw `"Không tìm thấy phòng"`.
    - `roomOf(userId): Room | undefined`
    - `leave(userId)`
    - `setConnected(userId, bool)`
    - Tạo hoặc vào một phòng mới thì tự `leave` phòng cũ.
    - Cứ mỗi phút quét một lần, xóa phòng đã `isEmptyOfConnected` liên tục từ 10 phút trở lên.
  - `createServer({ store, jwtSecret, secureCookies, clientDist? }): { httpServer, io, manager }`
  - Sự kiện client → server, mọi sự kiện đều có ack `(res: { ok: true; code?: string } | { ok: false; error: string })`:
    - `room:create`, `room:join {code}`, `room:leave`, `room:settings {timeLimitSec}`
    - `game:start`, `game:next`, `hand:submit Arrangement`, `hand:unsubmit`
    - Payload được kiểm tra bằng zod: rank là số nguyên 2–14, suit thuộc S/H/D/C, chi có độ dài 5/5/3.
  - Sự kiện server → client:
    - `room:state RoomStateView | null`
    - `game:dealt DealtPayload`
    - `game:result GameResultPayload`
    - `session:replaced`
  - Mỗi user có một room Socket.IO riêng tên `user:<id>`, dùng cho `dealt` và `snapshot`.
  - Khi kết nối, nếu user đang ở trong một phòng thì gửi `snapshotFor`.
  - Socket xác thực bằng cookie `binh_token` trong `handshake.headers.cookie`. Không có hoặc sai thì `next(new Error('unauthorized'))`.
  - Kết nối thứ hai của cùng một user: gửi `session:replaced` cho socket cũ rồi ngắt nó.
  - `index.ts`:
    - Có `DATABASE_URL` thì dùng Prisma store; không có thì dùng Memory store và ghi log cảnh báo `"Không có DATABASE_URL – dữ liệu chỉ lưu trong bộ nhớ"`.
    - Cổng lấy từ `PORT`, mặc định 3000.
    - `JWT_SECRET` bắt buộc khi production; khi dev dùng giá trị mặc định cố định.

- [ ] **Step 1: Viết test thất bại:**
  - `roomManager.test.ts`:
    - Mã phòng khớp `/^[A-HJ-NP-Z2-9]{6}$/`.
    - User đang ở phòng X mà tạo phòng Y → `roomOf` trả về Y, và X không còn user đó.
    - Phòng không ai kết nối, sau `advanceTimersByTime(10*60_000 + 60_000)` → bị xóa. Join vào phòng đó → `"Không tìm thấy phòng"`.
  - `socket.test.ts` (server thật trên cổng ngẫu nhiên, Memory store, client dùng `socket.io-client` với `extraHeaders.cookie` lấy từ đăng ký qua supertest):
    - Không có cookie → kết nối bị lỗi `unauthorized`.
    - A tạo phòng, B join bằng mã, A start → cả hai nhận `game:dealt`. Cả hai nộp `autoArrange(cards)` → cả hai nhận `game:result` với tổng điểm bằng 0. Sau đó `GET /api/me` của A cho thấy `gamesPlayed === 1`.
    - B nộp bài, ngắt kết nối, rồi kết nối lại → nhận `room:state` có status `submitted` và `game:dealt` có `submitted` khác null (RF3 qua socket).
    - A mở socket thứ hai → socket đầu nhận `session:replaced` rồi bị ngắt.
    - `hand:submit` sai định dạng (chi 3 có 4 lá) → ack `{ ok: false }`.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt. Cài thêm `socket.io`, `cookie`, và devDep `socket.io-client`.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Thêm script `dev` cho server: `tsx watch src/index.ts`. Chạy thử và kiểm tra log có dòng `Listening on 3000`.
- [ ] **Step 6:** Commit `feat(server): socket layer and room manager`, rồi push.

### Task 11: API lịch sử và bảng xếp hạng

**Files:** Create `packages/server/src/api/routes.ts`, mount vào `app.ts`. Test `packages/server/test/api.test.ts`.

**Interfaces:**
- Produces (các endpoint này đều cần cookie, thiếu thì trả 401):
  - `GET /api/history` → `GameSummary[]` (50 ván gần nhất)
  - `GET /api/games/:id` → `GameDetail`, hoặc 404 `{error:"Không tìm thấy ván"}`
  - `GET /api/leaderboard` → `LeaderboardRow[]` (top 50)

- [ ] **Step 1: Viết test thất bại:** chèn sẵn một ván qua `store.saveGame`, rồi kiểm tra cả 3 endpoint trả đúng dữ liệu, đúng 401 khi thiếu cookie, và 404 khi id không tồn tại.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Commit `feat(server): history and leaderboard API`, rồi push.

### Task 12: Client – khung, đăng nhập, sảnh, phòng chờ

**Files:** Create `packages/client/` (Vite React TS: `package.json`, `vite.config.ts`, `index.html`, `tsconfig.json`), `src/main.tsx`, `src/App.tsx`, `src/api.ts`, `src/socket.ts`, `src/auth.tsx`, `src/toast.tsx`, `src/styles.css`, `src/pages/Login.tsx`, `src/pages/Lobby.tsx`, `src/pages/RoomPage.tsx` (lúc này mới có phần `WAITING`). Test `packages/client/test/login.test.tsx`.

**Interfaces:**
- Consumes: các kiểu trong `protocol.ts`, REST và socket ở Task 7, 10.
- Produces:
  - `api.ts`: `register`, `login`, `logout`, `me`, `history`, `game(id)`, `leaderboard`. Mọi request dùng `credentials: 'include'`; lỗi thì throw `Error(body.error)`.
  - `socket.ts`: `getSocket()` (singleton, `withCredentials`), `emitAck(event, payload?) → Promise<{ok…}>`. Kết quả `ok: false` thì hiện toast lỗi.
  - `useAuth()` → `{ user: MeResponse | null; loading; refresh; logout }`
  - Routes: `/login`, `/` (sảnh), `/room/:code`, `/history`, `/games/:id`, `/leaderboard`. Chưa đăng nhập thì chuyển về `/login?next=…`.
  - Vite dev chạy cổng 5173, proxy `/api` và `/socket.io` (có `ws: true`) sang `localhost:3000`.

- [ ] **Step 1:** Tạo dự án bằng `npm create vite@latest packages/client -- --template react-ts`, rồi chỉnh tên package thành `@binh/client` và thêm `@binh/rules: "*"`. Cài `react-router-dom`, devDeps `@testing-library/react @testing-library/user-event jsdom`. Tạo `packages/client/vitest.config.ts` với `environment: 'jsdom'`.
- [ ] **Step 2: Viết test thất bại** `login.test.tsx`: mock `api.login` reject với `"Sai tên đăng nhập hoặc mật khẩu"` → sau khi bấm "Đăng nhập", thông báo đó hiện trên màn hình. Chuyển sang tab "Đăng ký" thì nút đổi thành "Đăng ký".
- [ ] **Step 3:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 4:** Cài đặt các trang:
  - **Login:** tab Đăng nhập / Đăng ký.
  - **Lobby:** nút "Tạo phòng", ô "Mã phòng" + nút "Vào", hiển thị tổng điểm, link tới Lịch sử và Bảng xếp hạng, nút Đăng xuất.
  - **RoomPage ở `WAITING`:**
    - Mã phòng kèm nút "Sao chép link".
    - Danh sách người chơi (ghi rõ chủ phòng và người mất kết nối).
    - Ô chọn thời gian 30–300 giây, bước 15, chỉ chủ phòng chỉnh được.
    - Nút "Bắt đầu" (chỉ chủ phòng, cần ≥2 người) và "Rời phòng".
    - Khi mount, nếu `room:state` chưa phải phòng này thì `emitAck('room:join', {code})`; join lỗi thì toast rồi quay về `/`.
  - Banner "Đang kết nối lại…" khi socket bị ngắt. Sự kiện `session:replaced` hiện thông báo "Bạn đã mở game ở tab khác".
  - CSS ưu tiên điện thoại, chạy tốt ở chiều ngang 360px.
- [ ] **Step 5:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 6:** Thêm script gốc `"dev": "concurrently -n server,client \"npm run dev -w @binh/server\" \"npm run dev -w @binh/client\""` (cài `concurrently` ở gốc). Chạy `npm run dev`, dùng 2 cửa sổ trình duyệt với 2 tài khoản: đăng ký → tạo phòng → người kia vào bằng link → cả hai thấy danh sách người chơi cập nhật.
- [ ] **Step 7:** Commit `feat(client): auth, lobby and waiting room`, rồi push.

### Task 13: Client – màn hình xếp bài

**Files:** Create `packages/client/src/arrange/arrangeState.ts`, `src/arrange/ArrangeBoard.tsx`, `src/components/CardView.tsx`, `src/components/Timer.tsx`. Modify `src/pages/RoomPage.tsx` để thêm phần `ARRANGING`. Test `packages/client/test/arrangeState.test.ts`, `packages/client/test/ArrangeBoard.test.tsx`.

**Interfaces:**
- Consumes: `evaluate`, `catName`, `foulReason`, `foulMessage`, `cardKey`.
- Produces:
  - `type Slots = Card[]`: 13 ô. Ô 0–2 là chi 3, ô 3–7 là chi 2, ô 8–12 là chi 1.
  - `initialSlots(cards: Card[]): Slots`: sắp giảm dần theo giá trị; 5 lá đầu vào chi 1, 5 lá tiếp vào chi 2, 3 lá cuối vào chi 3.
  - `swap(s: Slots, i: number, j: number): Slots`
  - `toArrangement(s: Slots): Arrangement`, `fromArrangement(a: Arrangement): Slots`
  - `sortWithinChis(s: Slots, by: 'rank' | 'suit'): Slots`: sắp lại lá trong từng chi, không chuyển lá sang chi khác.
  - `<CardView card selected? faceDown? onClick?>`: hiển thị giá trị và ký hiệu ♠♥♦♣; Cơ và Rô màu đỏ.
  - `<ArrangeBoard cards submitted deadline onSubmit(a) onUnsubmit()>`

- [ ] **Step 1: Viết test thất bại:**
  - `arrangeState.test.ts`:
    - `initialSlots` đặt lá lớn nhất ở ô 8.
    - `swap(s, 0, 12)` đổi đúng 2 phần tử và không làm thay đổi mảng gốc.
    - `toArrangement` rồi `fromArrangement` cho lại đúng `Slots` ban đầu.
    - `sortWithinChis` giữ nguyên tập lá của mỗi chi.
  - `ArrangeBoard.test.tsx`:
    - Chạm lá ở ô 0 rồi chạm lá ở ô 12 → hai lá đổi chỗ.
    - Mỗi hàng hiển thị tên loại bài đúng, ví dụ "Đôi".
    - Với bài được đặt sẵn bị lủng → hiện `"Binh lủng: Chi 2 mạnh hơn Chi 1"` nhưng nút "Xong" vẫn bấm được.
    - Khi `submitted` → nút đổi thành "Sửa lại" và không đổi chỗ lá được nữa.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
  - Bố cục 3 hàng: Chi 3 ở trên, Chi 1 ở dưới.
  - Đổi chỗ bằng cách chạm lá này rồi chạm lá kia. Trên máy tính có thêm kéo thả HTML5, dùng chung hàm `swap`.
  - Các nút "Xếp theo giá trị", "Xếp theo chất", "Xong" / "Sửa lại".
  - `Timer` đếm ngược theo `deadline` của server, dưới 10 giây thì chuyển màu đỏ.
  - Đối thủ hiện ở trên cùng kèm trạng thái "Đang xếp" / "Xong" / "Mất kết nối".
  - Nếu snapshot có `submitted` thì dùng `fromArrangement` để khôi phục cách xếp.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Kiểm tra thủ công với 2 tài khoản: chơi đến lúc xếp bài, đổi chỗ vài lá, tạo một cách xếp lủng để thấy cảnh báo, bấm Xong / Sửa lại, F5 giữa chừng và thấy bài còn nguyên. Thu nhỏ trình duyệt về chiều ngang 375px và kiểm tra bố cục không vỡ.
- [ ] **Step 6:** Commit `feat(client): arrangement board`, rồi push.

### Task 14: Client – lật bài, lịch sử, bảng xếp hạng

**Files:** Create `packages/client/src/components/RevealView.tsx`, `src/pages/History.tsx`, `src/pages/GameDetail.tsx`, `src/pages/Leaderboard.tsx`. Modify `RoomPage.tsx` để thêm phần `REVEAL`. Test `packages/client/test/RevealView.test.tsx`.

**Interfaces:**
- Consumes: `GameResultPayload`, `GameDetail`, `compareHands`, `catName`, `specialName`.
- Produces: `<RevealView result: GameResultPayload | GameDetail animate: boolean myUserId>`

- [ ] **Step 1: Viết test thất bại** (dùng fake timers):
  - Khi `animate=true`, ban đầu chi 1 của mọi người đang úp. Sau 1500ms chi 1 lật lên; sau 4500ms cả 3 chi đã lật và hiện bảng điểm.
  - Người lủng có huy hiệu "Binh lủng". Người thắng trắng có tên loại, ví dụ "3 thùng". Cặp sập hầm có nhãn "Sập hầm".
  - Ở mỗi chi, bài mạnh nhất trong số những người không lủng và không thắng trắng được làm nổi bật.
  - Khi `animate=false` (dùng cho trang xem lại), mọi thứ hiện ngay lập tức.
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL.
- [ ] **Step 3:** Cài đặt.
  - **RevealView:** mỗi chi lật sau 1,5 giây. Bảng tổng kết gồm điểm ván của từng người (dấu +/− có màu), `roomScore`, và danh sách các cặp kèm `net`. Ai được máy xếp hộ thì có nhãn "Máy xếp".
  - **RoomPage ở `REVEAL`:** hiện `RevealView`, chủ phòng có nút "Ván mới".
  - **Trang History:** danh sách ván (thời gian, người chơi, điểm của tôi). Bấm vào thì mở `/games/:id`, trang này dùng `RevealView` với `animate=false`.
  - **Trang Leaderboard:** bảng xếp hạng.
- [ ] **Step 4:** Chạy `npm test`. Kỳ vọng: PASS.
- [ ] **Step 5:** Kiểm tra thủ công với 3 tài khoản: chơi 2 ván liên tiếp, thấy hoạt cảnh lật bài, điểm cộng dồn đúng, trang Lịch sử có cả 2 ván, bảng xếp hạng cập nhật.
- [ ] **Step 6:** Commit `feat(client): reveal, history and leaderboard`, rồi push.

### Task 15: Build production + deploy

**Files:** Modify `packages/server/src/app.ts` (phục vụ `clientDist` và fallback mọi route về `index.html`, trừ `/api` và `/socket.io`), `package.json` gốc. Create `render.yaml`, `README.md`, `.env.example`.

**Interfaces:**
- Produces scripts ở gốc:
  - `build`: `npm run build -w @binh/client && npm run prisma:generate -w @binh/server`
  - `start`: `npm run start -w @binh/server`, trong đó server chạy `prisma migrate deploy && tsx src/index.ts`
  - Trong production, `clientDist` là `packages/client/dist`.

- [ ] **Step 1: Viết test thất bại** `packages/server/test/static.test.ts`: dựng `createApp` với `clientDist` trỏ tới một thư mục tạm có `index.html` → `GET /room/ABC234` trả về nội dung `index.html`, còn `GET /api/me` không cookie vẫn trả 401 (không bị fallback nuốt mất).
- [ ] **Step 2:** Chạy test. Kỳ vọng: FAIL. Sau đó cài đặt. Chạy lại. Kỳ vọng: PASS.
- [ ] **Step 3:** Viết `render.yaml`:
  - Một web service Node, region `singapore`, plan `free`.
  - `buildCommand: npm ci && npm run build`, `startCommand: npm start`.
  - Biến môi trường: `NODE_ENV=production`, `JWT_SECRET` (`generateValue: true`), `DATABASE_URL` (`sync: false`, người dùng tự dán chuỗi kết nối Neon vào).
- [ ] **Step 4:** Viết `README.md` bằng tiếng Việt:
  - Chạy local: `npm install`, `npm run dev`, mở `http://localhost:5173`; không cần database.
  - Chạy test: `npm test`.
  - Deploy:
    1. Tạo project trên Neon và copy connection string.
    2. Vào Render, chọn New → Blueprint, chọn repo `noway165/binhxapxam`.
    3. Dán `DATABASE_URL`.
    4. Đợi build xong và mở link.
  - Lưu ý: bản miễn phí ngủ sau 15 phút không dùng, lần mở đầu tiên phải chờ khoảng 30–50 giây.
- [ ] **Step 5:** Chạy thử production ở máy: `npm run build`, rồi `NODE_ENV=production JWT_SECRET=x PORT=3000 npx tsx packages/server/src/index.ts` (không có `DATABASE_URL` nên dùng Memory store; bỏ qua bước migrate bằng cách chạy thẳng `tsx`). Mở `http://localhost:3000` và chơi trọn một ván với 2 tab ẩn danh.
- [ ] **Step 6:** Chạy `npm test` toàn bộ. Kỳ vọng: PASS.
- [ ] **Step 7:** Commit `chore: production build and Render deploy config`, rồi push.
