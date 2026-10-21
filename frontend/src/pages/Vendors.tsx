import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Phone, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { formatINR } from '../utils/format';

export default function Vendors() {
  const { activeEvent, activeEventId } = useApp();
  const [vendors, setVendors] = useState<any[]>([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('');
  const [bookingStatus, setBookingStatus] = useState('not_contacted');
  const [notes, setNotes] = useState('');

  const loadVendors = async () => {
    if (!activeEventId) return;
    try {
      const data = await api.listVendors(activeEventId);
      setVendors(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [activeEventId]);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !category.trim()) return;

    try {
      await api.createVendor(activeEventId, {
        category: category.trim(),
        vendor_name: vendorName.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        estimated_cost: estimatedCost !== '' ? Number(estimatedCost) : undefined,
        booking_status: bookingStatus,
        notes: notes.trim() || undefined,
      });

      setShowModal(false);
      setCategory('');
      setVendorName('');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setEstimatedCost('');
      setBookingStatus('not_contacted');
      setNotes('');

      await loadVendors();
    } catch (err: any) {
      alert(err.message || 'Failed to add vendor');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!activeEventId || !window.confirm('Delete vendor checklist entry?')) return;
    try {
      await api.deleteVendor(activeEventId, vendorId);
      await loadVendors();
    } catch (e) {
      console.error(e);
    }
  };

  if (!activeEvent) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-16">
        <Users size={36} className="mx-auto text-gray-400 mb-2" />
        <h3 className="text-lg font-bold text-[#1a2b4a]">No event selected</h3>
        <p className="text-xs text-gray-500 mt-1">Please select an event to view the vendor checklist.</p>
      </div>
    );
  }

  const bookedCount = vendors.filter((v) => v.booking_status === 'booked' || v.booking_status === 'confirmed').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1a2b4a] tracking-tight">Vendor Checklist</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            Manual booking, engagement, and billing tracking for {activeEvent.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Vendors</span>
          <p className="text-xl font-black text-[#1a2b4a] mt-0.5">{vendors.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Confirmed / Booked</span>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{bookedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">In Negotiation</span>
          <p className="text-xl font-black text-blue-600 mt-0.5">
            {vendors.filter((v) => v.booking_status === 'negotiating' || v.booking_status === 'contacted').length}
          </p>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vendors.map((vendor) => {
          const isConfirmed = vendor.booking_status === 'confirmed' || vendor.booking_status === 'booked';
          return (
            <div
              key={vendor.id}
              className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {vendor.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteVendor(vendor.id)}
                    className="text-gray-300 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className="text-base font-bold text-[#1a2b4a] mt-1">
                  {vendor.vendor_name || 'Vendor Unassigned'}
                </h3>

                {vendor.contact_name && (
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Contact: {vendor.contact_name}
                  </p>
                )}

                <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                  {vendor.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-gray-400" />
                      <span>{vendor.contact_phone}</span>
                    </div>
                  )}
                  {vendor.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-gray-400" />
                      <span className="truncate">{vendor.contact_email}</span>
                    </div>
                  )}
                </div>

                {vendor.notes && (
                  <p className="text-[11px] text-gray-400 mt-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                    {vendor.notes}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Estimated Cost</span>
                  <span className="text-sm font-bold text-[#1a2b4a]">
                    {vendor.estimated_cost ? formatINR(vendor.estimated_cost) : 'Quote pending'}
                  </span>
                </div>

                <select
                  value={vendor.booking_status}
                  onChange={async (e) => {
                    await api.updateVendor(activeEventId!, vendor.id, { booking_status: e.target.value });
                    await loadVendors();
                  }}
                  className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border border-transparent focus:outline-none cursor-pointer ${
                    isConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <option value="not_contacted">Not Contacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="booked">Booked</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-[#1a2b4a] mb-4">Add Vendor Checklist Entry</h3>
            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category / Service *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Catering, Florist, Sound / AV"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vendor / Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Banquet Caterers"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contact@vendor.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Booking Status</label>
                <select
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="not_contacted">Not Contacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="negotiating">Negotiating</option>
                  <option value="booked">Booked</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes / Deliverables</label>
                <textarea
                  rows={2}
                  placeholder="Terms, advance payment, dietary restrictions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
