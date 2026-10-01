import razorpayInstance from "../config/razorpay.js";
import { Payment } from "../models/paymentModel.js";
import crypto from 'crypto'
import { User } from "../models/userModel.js";


export const createOrder = async (req, res) => {
    try {
        const { planId, amount, credits } = req.body;
        if (!amount || !credits) {
            return res.status(400).json({ message: "Invalid plan data" })
        }

        // Step 1: Create Razorpay order
        const options = {
            amount: Math.round(Number(amount) * 100), // convert to paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);
        console.log("✅ Razorpay Order Created:", razorpayOrder);

        await Payment.create({
            userId: req.user._id,
            planId,
            amount,
            credits,
            razorpayOrderId:razorpayOrder.id,
            status:"pending"
        })
        console.log(razorpayOrder)
        return res.json(razorpayOrder)
    } catch (error) {
         return res.status(500).json({message:error.message})
    }
}

export const simulateTestPayment = async (req, res) => {
    if (process.env.NODE_ENV === "production" || !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
        return res.status(404).json({ message: "Test payment simulation is unavailable" })
    }

    try {
        const { orderId, outcome } = req.body
        if (!orderId || !["success", "failure"].includes(outcome)) {
            return res.status(400).json({ message: "A valid order and test outcome are required" })
        }

        const payment = await Payment.findOneAndUpdate(
            { razorpayOrderId: orderId, userId: req.user._id, status: "pending" },
            {
                $set: {
                    status: outcome === "success" ? "paid" : "failed",
                    ...(outcome === "success" ? { razorpayPaymentId: `test_${orderId}` } : {})
                }
            },
            { new: true }
        )

        if (!payment) {
            return res.status(404).json({ message: "Pending test order not found" })
        }

        if (outcome === "failure") {
            return res.json({
                success: false,
                message: "Test payment failed. No credits were added."
            })
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $inc: { credits: payment.credits }, plan: payment.planId },
            { new: true }
        )

        if (!user) {
            await Payment.findByIdAndUpdate(payment._id, {
                status: "pending",
                $unset: { razorpayPaymentId: 1 }
            })
            return res.status(404).json({ message: "User not found" })
        }

        return res.json({
            success: true,
            message: "Test payment succeeded. Credits have been added.",
            user
        })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

// Verify Payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    // const userId = req.user._id;

    // ✅ Handle successful payment
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
       return res.status(400).json({message:"Invalid Payment Signature"})
    }

    const payment = await Payment.findOne({
        razorpayOrderId:razorpay_order_id
    })

    if(!payment){
        return res.status(400).json({message:"Payment not found"})
    }
    if(payment.status === "paid"){
        return res.json({message:"Already processed"})
    }

    //update payment record
    payment.status = "paid"
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save()

    //update user credits
    const updateUser = await User.findByIdAndUpdate(
    payment.userId,
    {
        $inc: { credits: payment.credits },
        plan: payment.planId
    },
    { new: true }
)
    res.json({
        success:true,
        message:"Payment Verified and Credit added",
        user:updateUser
    })
  } catch (error) {
    console.error("❌ Error in verifyPayment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};