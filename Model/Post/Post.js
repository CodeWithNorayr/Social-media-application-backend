import mongoose from "mongoose"

const postSchema = new mongoose.Schema({
  text:{type:String,required:false},
  image:{type:String,required:false},
  user:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
  likes:[{type:mongoose.Schema.Types.ObjectId,ref:"User"}],
},{timestamps:true,minimize:false});

const Post = mongoose.models.Post || mongoose.model("Post",postSchema);

export default Post;