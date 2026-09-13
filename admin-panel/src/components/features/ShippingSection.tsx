import { useState, useEffect } from 'react';
import { Truck, Package, Download, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { shippingApi, type ShippingRate } from '../../lib/api';
import type { Order } from '../../lib/api';

interface ShippingSectionProps {
  order: Order;
  onShipmentCreated: () => void;
}

export default function ShippingSection({ order, onShipmentCreated }: ShippingSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  
  // Form fields
  const [pickupPincode, setPickupPincode] = useState('110001'); // Default from env
  const [deliveryPincode, setDeliveryPincode] = useState(order.delivery_pincode || '');
  const [weight, setWeight] = useState<number>(0);
  const [codAmount, setCodAmount] = useState<number>(order.total_amount || 0);

  // Calculate weight from order items
  useEffect(() => {
    if (order.order_items && order.order_items.length > 0) {
      const totalWeight = order.order_items.reduce((sum, item) => {
        const itemWeight = item.products?.weight || 500; // Default 500g per item
        return sum + (itemWeight * item.quantity);
      }, 0);
      setWeight(Math.max(500, totalWeight)); // Minimum 500g
    }
  }, [order.order_items]);

  const handleGetRates = async () => {
    if (!pickupPincode || !deliveryPincode || !weight) {
      setError('Please fill all required fields');
      return;
    }

    setRatesLoading(true);
    setError(null);
    try {
      const shippingRates = await shippingApi.getShippingRates({
        pickup_pincode: pickupPincode,
        delivery_pincode: deliveryPincode,
        weight: weight,
        cod_amount: codAmount > 0 ? codAmount : undefined,
      });
      setRates(shippingRates);
      setShowRatesModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch shipping rates');
    } finally {
      setRatesLoading(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedCourier || !pickupPincode || !deliveryPincode) {
      setError('Please select a courier and fill all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await shippingApi.createShipment({
        order_id: order.id,
        courier_id: selectedCourier,
        pickup_pincode: pickupPincode,
        delivery_pincode: deliveryPincode,
        weight: weight,
        cod_amount: codAmount > 0 ? codAmount : undefined,
      });

      if (result.success) {
        setShowCreateModal(false);
        setShowRatesModal(false);
        onShipmentCreated();
      } else {
        setError(result.message || 'Failed to create shipment');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLabel = async () => {
    if (!order.shipping_awb) return;

    setLoading(true);
    setError(null);
    try {
      const result = await shippingApi.generateLabel(order.shipping_awb);
      if (result.label_url) {
        window.open(result.label_url, '_blank');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate label');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackShipment = () => {
    if (order.shipping_tracking_url) {
      window.open(order.shipping_tracking_url, '_blank');
    }
  };

  // If shipment already exists, show shipment info
  if (order.shipping_awb) {
    return (
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Truck className="h-5 w-5" />
          <span>Shipping Information</span>
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">AWB Number</p>
              <p className="text-white font-mono font-semibold">{order.shipping_awb}</p>
            </div>
            {order.shipping_courier && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Courier</p>
                <p className="text-white">{order.shipping_courier}</p>
              </div>
            )}
          </div>

          {order.shipping_tracking_url && (
            <button
              type="button"
              onClick={handleTrackShipment}
              className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all flex items-center justify-center space-x-2"
            >
              <Package className="h-4 w-4" />
              <span>Track Shipment</span>
            </button>
          )}

          {order.shipping_label_url && (
            <button
              type="button"
              onClick={() => window.open(order.shipping_label_url, '_blank')}
              className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Label</span>
            </button>
          )}

          {!order.shipping_label_url && order.shipping_awb && (
            <button
              type="button"
              onClick={handleGenerateLabel}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Generate Label</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // If no shipment, show create button
  return (
    <>
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Truck className="h-5 w-5" />
          <span>Shipping</span>
        </h2>

        <p className="text-gray-400 mb-4">No shipment created yet for this order.</p>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setError(null);
          }}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center space-x-2"
        >
          <Truck className="h-5 w-5" />
          <span>Create Shipment</span>
        </button>
      </div>

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Create Shipment</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-white"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Pickup Pincode <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pickupPincode}
                    onChange={(e) => setPickupPincode(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="110001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Delivery Pincode <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryPincode}
                    onChange={(e) => setDeliveryPincode(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter pincode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Weight (grams) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="500"
                    min="500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    COD Amount
                  </label>
                  <input
                    type="number"
                    value={codAmount}
                    onChange={(e) => setCodAmount(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleGetRates}
                  disabled={ratesLoading || !pickupPincode || !deliveryPincode || !weight}
                  className="flex-1 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {ratesLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading Rates...</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      <span>Get Shipping Rates</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 mt-6 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rates Modal */}
      {showRatesModal && rates.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Select Courier</h3>
              <button
                type="button"
                onClick={() => {
                  setShowRatesModal(false);
                  setSelectedCourier('');
                }}
                className="text-gray-400 hover:text-white"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {rates.map((rate) => (
                <button
                  type="button"
                  key={rate.courier_id}
                  onClick={() => setSelectedCourier(rate.courier_id)}
                  className={`w-full p-4 rounded-lg border transition-all text-left ${
                    selectedCourier === rate.courier_id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{rate.courier_name}</p>
                      <p className="text-sm text-gray-400">{rate.service_type}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Estimated delivery: {rate.estimated_days} days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">₹{rate.rate.toLocaleString()}</p>
                      {selectedCourier === rate.courier_id && (
                        <CheckCircle2 className="h-5 w-5 text-purple-400 mt-1 ml-auto" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowRatesModal(false);
                  setSelectedCourier('');
                }}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateShipment}
                disabled={loading || !selectedCourier}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Truck className="h-5 w-5" />
                    <span>Create Shipment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
