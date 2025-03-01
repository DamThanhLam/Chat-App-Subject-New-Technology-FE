// Hàm tính khoảng cách thời gian
export const timeDifference = (updatedAt: Date): string => {
  // // Chuyển đổi `createdAt` sang Date nếu nó là chuỗi
  // const date = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  // // Kiểm tra nếu `date` là `undefined` hoặc không hợp lệ
  // const now = new Date(); // Lấy thời gian hiện tại

  // // Lấy thời gian chênh lệch giữa thời gian hiện tại và updatedAt (tính bằng milliseconds)
  // const timeDiff = now.getTime() - date.getTime(); // getTime() trả về milliseconds

  // // Tính số giây, phút, giờ, ngày từ sự khác biệt
  // const seconds = Math.floor(timeDiff / 1000); // Giây
  // const minutes = Math.floor(seconds / 60); // Phút
  // const hours = Math.floor(minutes / 60); // Giờ
  // const days = Math.floor(hours / 24); // Ngày


  // // Trả về kết quả dưới dạng chuỗi
  // if (days > 0) {
  //   return `${days} ngày trước`;
  // } else if (hours > 0) {
  //   return `${hours} giờ trước`;
  // } else if (minutes > 0) {
  //   return `${minutes} phút trước`;
  // } else {
  //   if (seconds < 0) {
  //     return `0 giây trước`;
  //   }
  //   return `${seconds} giây trước`;
  // }
  return""
};
