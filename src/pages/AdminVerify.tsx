import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { graphQLClient } from '../GraphqlClient';
import { APPROVE_ADMIN_BY_TOKEN } from '../graphql/mutation';
import { useToast } from '../hooks/use-toast';
import img from "../assets/images/Logo.webp";

const AdminVerify = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyAdmin = async () => {
    const token = searchParams.get('token');
    
    if (!token) {
      setError('No verification token provided');
      setLoading(false);
      toast({
        title: "Error",
        description: "No verification token provided in the URL",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResponse(null);
      
      const result = await graphQLClient.request<{ approveAdminByToken: string }>(
        APPROVE_ADMIN_BY_TOKEN,
        { token }
      );
      
      setResponse(result.approveAdminByToken);
      setLoading(false);
      toast({
        title: "Success",
        description: "Admin verification completed successfully",
        variant: "default"
      });
    } catch (err: any) {
      const errorMessage = err?.response?.errors?.[0]?.message || err?.message || "Failed to verify admin";
      setError(errorMessage);
      setLoading(false);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    verifyAdmin();
  }, [searchParams, toast]);

  const handleRetry = () => {
    verifyAdmin();
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

      {/* Right Side - Verification Status */}
      <div className="flex justify-center items-center bg-[#004175] w-full md:w-[35%] min-h-[60vh] md:min-h-screen p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md border border-gray-100 space-y-6">
          <h2 className="text-3xl font-bold text-center text-[#004175] mb-2">
            Admin Verification
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-[#004175] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 text-center">Verifying admin account...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">Verification Failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleRetry}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#004175] text-white rounded-md hover:bg-[#003366] transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Retry
              </button>
            </div>
          ) : response ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-green-800">Verification Successful</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>{response}</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* <button
                onClick={handleRetry}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#004175] text-white rounded-md hover:bg-[#003366] transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Retry
              </button> */}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminVerify;

