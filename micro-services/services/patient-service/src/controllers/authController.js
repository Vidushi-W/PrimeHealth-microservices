const { loginUser, registerUser } = require("../services/authService");

async function register(req, res) {
  try {
    const result = await registerUser(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
}

async function login(req, res) {
  try {
    const result = await loginUser(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
}

module.exports = {
  register,
  login,
};
