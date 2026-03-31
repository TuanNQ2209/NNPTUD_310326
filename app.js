var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let mongoose = require('mongoose');
var fs = require('fs'); // Thêm fs để kiểm tra thư mục

// Khai báo Router
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// --- TỰ ĐỘNG TẠO THƯ MỤC UPLOADS NẾU CHƯA CÓ ---
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- CẤU HÌNH ĐỂ TRUY CẬP FILE UPLOAD QUA URL ---
// Ví dụ: http://localhost:3000/uploads/ten-file.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Đăng ký các API Routes
app.use('/', indexRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/categories', require('./routes/categories'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/roles', require('./routes/roles'));
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/carts', require('./routes/carts'));
app.use('/api/v1/upload', require('./routes/uploads'));

// --- ĐĂNG KÝ ROUTE MESSAGES (BÀI TẬP) ---
app.use('/api/v1/messages', require('./routes/messageRoutes'));

/**
 * CẤU HÌNH KẾT NỐI MONGODB DOCKER
 * Đã cập nhật User: admin | Pass: 123 | Database: NNPTUD-S3
 */
const mongoURI = 'mongodb://admin:123@127.0.0.1:27017/NNPTUD-S3?authSource=admin';

mongoose.connect(mongoURI)
  .then(() => {
    console.log(">>> [SUCCESS] Đã kết nối MongoDB thành công!");
  })
  .catch((err) => {
    console.error(">>> [ERROR] Lỗi kết nối MongoDB:", err.message);
  });

mongoose.connection.on('disconnected', function () {
  console.log(">>> [WARNING] MongoDB đã ngắt kết nối.");
});

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;