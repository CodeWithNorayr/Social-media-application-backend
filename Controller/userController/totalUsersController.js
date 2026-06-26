import User from "../../Model/User/User.js";

// Fetching all website users 

const fetchingUsers = async (_, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    if (!users.length) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0
      });
    }

    return res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

export default fetchingUsers;
