import User from "../../Model/User/User.js";

// Fetching all website users 

export const fetchingUsers = async (_, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "No one is registered yet"
      });
    }

    return res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};
