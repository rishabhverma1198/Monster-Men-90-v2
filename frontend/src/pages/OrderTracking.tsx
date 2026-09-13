import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Package, Search, Loader2, CheckCircle2, Truck, MapPin, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/api';
import BackButton from '../components/common/BackButton';

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const awbFromUrl = searchParams.get('awb') || '';
  
  const [awbNumber, setAwbNumber] = useState(awbFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<{
    awb_number: string;
    status: string;
    current_status: string;
    tracking_events: Array<{
      status: string;
      location: string;
      timestamp: string;
      description: string;
    }>;
    estimated_delivery?: string;
  } | null>(null);

  const handleTrack = async () => {
    if (!awbNumber.trim()) {
      setError('Please enter AWB number');
      return;
    }

    setLoading(true);
    setError(null);
    setTrackingData(null);

    try {
      const response = await apiService.trackShipment(awbNumber.trim());
      setTrackingData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to track shipment. Please check AWB number.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('delivered')) {
      return 'text-green-400 bg-green-500/20 border-green-500/50';
    }
    if (lowerStatus.includes('shipped') || lowerStatus.includes('in transit')) {
      return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('processing')) {
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    }
    if (lowerStatus.includes('cancelled') || lowerStatus.includes('failed')) {
      return 'text-red-400 bg-red-500/20 border-red-500/50';
    }
    return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
  };

  const getStatusIcon = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('delivered')) {
      return <CheckCircle2 className="h-5 w-5" />;
    }
    if (lowerStatus.includes('shipped') || lowerStatus.includes('in transit')) {
      return <Truck className="h-5 w-5" />;
    }
    return <Package className="h-5 w-5" />;
  };

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <BackButton to="/orders" label="Back to Orders" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2">
          Track Your Order
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your AWB (Air Waybill) number to track your shipment
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={awbNumber}
              onChange={(e) => setAwbNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
              placeholder="Enter AWB number"
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={handleTrack}
            disabled={loading || !awbNumber.trim()}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Tracking...</span>
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                <span>Track</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Tracking Results */}
      {trackingData && (
        <div className="space-y-6">
          {/* Current Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Current Status
              </h2>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold border flex items-center space-x-2 ${getStatusColor(trackingData.current_status)}`}>
                {getStatusIcon(trackingData.current_status)}
                <span>{trackingData.current_status}</span>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">AWB Number</p>
                <p className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {trackingData.awb_number}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {trackingData.status}
                </p>
              </div>
              {trackingData.estimated_delivery && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estimated Delivery</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(trackingData.estimated_delivery).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Timeline */}
          {trackingData.tracking_events && trackingData.tracking_events.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Tracking History
              </h2>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                
                <div className="space-y-6">
                  {trackingData.tracking_events.map((event, index) => (
                    <div key={index} className="relative flex items-start space-x-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        index === 0
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {index === 0 ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Clock className="h-6 w-6" />
                        )}
                      </div>
                      
                      {/* Event content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {event.status}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!trackingData.tracking_events || trackingData.tracking_events.length === 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No tracking events available yet. Your shipment is being processed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State - No search yet */}
      {!trackingData && !loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Track Your Shipment
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter your AWB number above to see real-time tracking information
          </p>
          <Link
            to="/orders"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>View My Orders</span>
          </Link>
        </div>
      )}
    </div>
  );
}
