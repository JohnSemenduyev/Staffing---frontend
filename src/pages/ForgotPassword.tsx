import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { graphQLClient } from "../GraphqlClient";
import { REQUEST_PASSWORD_RESET } from "../graphql/mutation";
import img from "../assets/images/Logo.webp";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await graphQLClient.request<{ requestPasswordReset: boolean }>(
        REQUEST_PASSWORD_RESET,
        { email: email.trim().toLowerCase() }
      );

      if (result.requestPasswordReset) {
        toast({
          title: "Reset link sent",
          description: "If an account exists with this email, you will receive a password reset link shortly.",
        });
        // Optionally navigate back to login after a delay
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        toast({
          title: "Request failed",
          description: "We could not process your request. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.errors?.[0]?.message ||
        error?.message ||
        "Failed to send reset email";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Logo */}
      <div className="flex w-full md:w-[65%] bg-white flex-col items-center justify-center p-5 min-h-[40vh] md:min-h-screen">
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={img}
            alt="Maximal Security - Complete Logo"
            className="w-[90%] md:w-[90%] h-auto object-contain max-h-[35vh] md:max-h-[80vh]"
          />
        </div>
      </div>

      {/* Right Side - Forgot Password Form */}
      <div className="flex justify-center items-center bg-[#004175] w-full md:w-[35%] min-h-[60vh] md:min-h-screen p-6 overflow-y-auto">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold text-[#004175]">Forgot Password</h2>
            <p className="text-sm text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm text-gray-700 font-medium">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                required
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-600">
            Remembered your password?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-[#004175] hover:underline font-medium"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

