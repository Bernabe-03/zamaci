import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Note: useNewUrlParser and useUnifiedTopology are deprecated and no longer necessary,
    // but I'll keep them for compatibility if you're using an older Mongoose version.
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;