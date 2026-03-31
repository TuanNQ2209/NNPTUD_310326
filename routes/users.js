const express = require("express");
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx'); // Thay đổi ở đây
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const userModel = require("../schemas/users");
const roleModel = require("../schemas/roles");
const upload = multer({ dest: 'uploads/' });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "e063ac8497d163", 
    pass: "9a00701689445c" 
  }
});

router.post("/import", upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send({ message: "Chưa chọn file Excel!" });
  const filePath = req.file.path;

  try {
    await userModel.deleteMany({});
    console.log("--- Đã dọn dẹp database ---");

    let userRole = await roleModel.findOne({ name: { $regex: /USER/i } });
    if (!userRole) userRole = await roleModel.create({ name: "USER", description: "Default role" });

    // --- ĐỌC FILE EXCEL ---
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên
    const worksheet = workbook.Sheets[sheetName];
    const results = xlsx.utils.sheet_to_json(worksheet); // Chuyển thành mảng JSON
    // -----------------------

    console.log(`Tìm thấy ${results.length} dòng trong file Excel.`);

    // Chạy ngầm quá trình gửi mail
    (async () => {
        let successCount = 0;
        for (let row of results) {
          // Kiểm tra tên cột trong Excel (phải khớp với tên tiêu đề bạn đặt trong file)
          const email = (row.email || row.Email || "").trim();
          const username = (row.username || row.Username || "").trim();
          
          if (!email || !email.includes('@')) continue;

          try {
            const plainPassword = crypto.randomBytes(4).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(plainPassword, salt);

            await userModel.create({
              username: username || email.split('@')[0],
              email: email,
              password: hashedPassword,
              role: userRole._id,
              status: true
            });

            console.log(`Đang đợi 10 giây trước khi gửi mail cho ${email}...`);
            await sleep(10000); 

            await transporter.sendMail({
              from: '"HUTECH Admin" <admin@hutech.edu.vn>',
              to: email,
              subject: "Tài khoản từ file Excel",
              html: `<p>Chào ${username}, mật khẩu Excel của bạn là: <b>${plainPassword}</b></p>`
            });

            successCount++;
            console.log(`[${successCount}] Thành công: ${email}`);
          } catch (err) {
            console.error(`Lỗi tại ${email}:`, err.message);
          }
        }
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.log("--- HOÀN TẤT IMPORT TỪ EXCEL ---");
    })();

    res.send({ message: "Đang xử lý file Excel ngầm, vui lòng theo dõi Mailtrap!" });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).send({ message: "Lỗi đọc file: " + error.message });
  }
});

module.exports = router;