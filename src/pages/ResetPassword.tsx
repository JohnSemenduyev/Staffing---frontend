import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { graphQLClient } from "../GraphqlClient";
import { UPDATE_PASSWORD } from "../graphql/mutation";
import img from "../assets/images/Logo.webp";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: "Invalid link",
        description: "Reset token is missing. Please use the link from your email.",
        variant: "destructive",
      });
      return;
    }

    if (!password || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please enter and confirm your new password.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Password and confirmation must be identical.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await graphQLClient.request<{ updatePassword: boolean }>(
        UPDATE_PASSWORD,
        { token, password, confirmPassword }
      );

      if (result.updatePassword) {
        toast({
          title: "Password updated",
          description: "Your password has been reset successfully.",
        });
        setShowSuccessModal(true);
      } else {
        toast({
          title: "Reset failed",
          description: "We could not reset your password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.errors?.[0]?.message ||
        error?.message ||
        "Failed to reset password";
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

      {/* Right Side - Reset Password Form */}
      <div className="flex justify-center items-center bg-[#004175] w-full md:w-[35%] min-h-[60vh] md:min-h-screen p-6 overflow-y-auto">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold text-[#004175]">Reset Password</h2>
            <p className="text-sm text-gray-600">
              Enter your new password to secure your account.
            </p>
            {!token && (
              <p className="text-sm text-red-600">
                No reset token found. Please reopen the link from your email.
              </p>
            )}
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm text-gray-700 font-medium">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700 font-medium">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004175]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting || !token}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
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

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-[#004175]">Password Reset</h3>
              <p className="text-sm text-gray-700">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/login");
              }}
            >
              Okay
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;

