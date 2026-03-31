const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Message = require('../models/Message');

// Cấu hình Multer để lưu file vào thư mục /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Giả định User hiện tại (Trong thực tế sẽ lấy từ Middleware Auth/JWT)
const CURRENT_USER = "user_A"; 

// --- 1. GET "/:userID" : Lấy toàn bộ message giữa 2 người ---
router.get("/:userID", async (req, res) => {
  try {
    const targetID = req.params.userID;
    const messages = await Message.find({
      $or: [
        { from: CURRENT_USER, to: targetID },
        { from: targetID, to: CURRENT_USER }
      ]
    }).sort({ createdAt: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 2. POST "/" : Gửi nội dung (Text hoặc File) ---
router.post("/", upload.single('file'), async (req, res) => {
  try {
    const { to, text } = req.body;
    let type = 'text';
    let content = text;

    // Kiểm tra nếu có file được upload lên
    if (req.file) {
      type = 'file';
      content = req.file.path; // Lưu đường dẫn dẫn đến file
    }

    const newMessage = new Message({
      from: CURRENT_USER,
      to: to,
      messageContent: {
        type: type,
        text: content
      }
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- 3. GET "/" : Lấy message cuối cùng của mỗi cuộc hội thoại ---
router.get("/", async (req, res) => {
  try {
    const lastMessages = await Message.aggregate([
      // Lọc các tin nhắn liên quan đến user hiện tại
      { $match: { $or: [{ from: CURRENT_USER }, { to: CURRENT_USER }] } },
      // Sắp xếp mới nhất lên đầu
      { $sort: { createdAt: -1 } },
      // Nhóm theo cặp (A-B và B-A là 1 nhóm)
      {
        $group: {
          _id: {
            $cond: [
              { $gt: ["$from", "$to"] },
              { p1: "$from", p2: "$to" },
              { p1: "$to", p2: "$from" }
            ]
          },
          latestMessage: { $first: "$$ROOT" }
        }
      },
      // Chuyển kết quả về dạng object message
      { $replaceRoot: { newRoot: "$latestMessage" } },
      // Sắp xếp lại danh sách hội thoại theo thời gian
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json(lastMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;