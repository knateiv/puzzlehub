# Puzzle Hub - bản web (để chơi thử trên iPhone)

Bản web này là **bản riêng**, viết lại bằng HTML/JavaScript từ ứng dụng Android. Bản nộp bài vẫn là ứng dụng
Android trong `D:\AndroidProjects\PuzzleHub` (không bị thay đổi).

Có đủ 6 game (Block Blast, Tic Tac Toe, One Line, Water Sort, Fruit Merge, Đập Chuột), Coins, quyền trợ giúp,
bảng xếp hạng, cài đặt (âm thanh, nhạc, giao diện tối, Việt/Anh). Dữ liệu lưu trong trình duyệt (localStorage).

## Cách 1: chơi thử ngay trên iPhone (cùng Wi-Fi với laptop, không cần tài khoản)
1. Trên laptop, bấm đúp file `start_server.bat` (cần có Python). Cửa sổ hiện địa chỉ dạng `http://192.168.x.x:8765`.
   Nếu Windows hỏi tường lửa, chọn **Allow access** (mạng Private).
2. Trên iPhone, mở **Safari** và gõ địa chỉ đó.
3. Muốn như một ứng dụng: bấm nút **Chia sẻ** (hình vuông có mũi tên) -> **Thêm vào Màn hình chính**.
4. Để chơi cần giữ cửa sổ `start_server.bat` mở và laptop bật. Chơi kiểu này **cần laptop**, chưa chơi offline được.

## Cách 2: chơi offline hẳn trên iPhone (cần đưa lên mạng miễn phí)
Trình duyệt chỉ cho "lưu offline" (service worker) khi trang chạy bằng **HTTPS**. Dùng GitHub Pages hoặc Netlify:
- GitHub Pages: tạo repository mới, đẩy toàn bộ thư mục này lên, vào Settings -> Pages -> chọn nhánh `main`.
  Sẽ có địa chỉ `https://tên-bạn.github.io/tên-repo/`.
- Netlify: vào app.netlify.com/drop rồi kéo thả thư mục này vào.
Mở địa chỉ đó trên iPhone, **Thêm vào Màn hình chính**, mở một lần khi có mạng; sau đó chơi được khi không có mạng.

## Khác biệt so với bản Android
- iPhone (Safari) **không hỗ trợ rung**, công tắc "Chế độ rung" không có tác dụng trên iPhone.
- Âm thanh/nhạc chỉ bật sau lần chạm đầu tiên (quy định của iOS). Nên nhớ **tắt chế độ im lặng** (gạt công tắc bên hông máy).
- Điểm, xu, ván Block Blast chơi dở được lưu trong trình duyệt; xóa dữ liệu Safari sẽ mất.

## Cấu trúc
`index.html`, `style.css`, `manifest.webmanifest`, `sw.js`, `icons/`, `js/core.js` (lưu trữ, ngôn ngữ, âm thanh),
`js/ui.js` (trang chủ, cài đặt, xếp hạng, khung game), `js/games/*.js` (6 game), `js/main.js`.
