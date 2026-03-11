import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, X, CheckCircle, AlertCircle, Truck,
  FileText, Package, CreditCard, ClipboardList, Clock, History
} from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';

const TABLE_NAME = 'Sale Of Raw Material';

// ─── Indian time helpers ───────────────────────────────────────────────
const getIndianTimeForActuals = () => {
  const options = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(new Date());
  
  let p = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }
  
  // Format to standard Postgres timestamp without time zone: "YYYY-MM-DD HH:mm:ss"
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
};

const formatDisplayDate = (val) => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  } catch { return String(val); }
};

// ─── Tab config ────────────────────────────────────────────────────────
const TABS = [
  { id: 'receive-order',      label: 'Receive Order Of Raw Material', icon: <ClipboardList size={16}/> },
  { id: 'arrange-logistics',  label: 'Arrange Logistics',              icon: <Truck size={16}/> },
  { id: 'make-invoice',       label: 'Make Invoice',                   icon: <FileText size={16}/> },
  { id: 'make-payment',       label: 'Make Payment',                   icon: <CreditCard size={16}/> },
];

// ═══════════════════════════════════════════════════════════════════════
// TAB 1 – Receive Order Of Raw Material
// ═══════════════════════════════════════════════════════════════════════
const ReceiveOrderTab = ({ onOrderSubmitted }) => {
  const emptyForm = {
    partyName: '',
    productName: '',
    qty: '',
    rate: '',
    typeOfTransporting: '',
    dateOfDispatch: '',
    poCopyFile: null,
  };

  const [form, setForm]           = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [nextOrderNo, setNextOrderNo] = useState('');
  const [loadingOrderNo, setLoadingOrderNo] = useState(true);

  // Generate next order number like od1, od2 …
  const fetchNextOrderNo = useCallback(async () => {
    setLoadingOrderNo(true);
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('ID', { ascending: false })
        .limit(1);

      if (error) throw error;

      let next = 1;
      if (data && data.length > 0 && data[0]['Order No.']) {
        const last = data[0]['Order No.'];
        const num = parseInt(last.replace(/\D/g, ''), 10);
        if (!isNaN(num)) next = num + 1;
      }
      setNextOrderNo(`od${next}`);
    } catch (err) {
      console.error('Error fetching order no:', err);
      setNextOrderNo('od1');
    } finally {
      setLoadingOrderNo(false);
    }
  }, []);

  useEffect(() => { fetchNextOrderNo(); }, [fetchNextOrderNo]);

  const handleChange = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.partyName || !form.productName || !form.qty || !form.rate || !form.poCopyFile) {
      toast.error('Please fill all required fields, including PO Copy.');
      return;
    }
    setSubmitting(true);

    // Indian time as ISO-compatible string for timestamp column
    const nowISO = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    try {
      let poCopyUrl = null;
      if (form.poCopyFile) {
        toast.info('Uploading PO Copy...');
        const fileExt = form.poCopyFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `sales of raw material/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('image')
          .upload(filePath, form.poCopyFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('image')
          .getPublicUrl(filePath);

        poCopyUrl = publicUrlData.publicUrl;
      }

      const insertPayload = {
        'Time Stamp': getIndianTimeForActuals(),
        'Order No.': nextOrderNo,
        'Party Name': form.partyName,
        'Product Name': form.productName,
        'Qty': parseFloat(form.qty) || null,
        'Rate': parseFloat(form.rate) || null,
        'Type Of Transporting': form.typeOfTransporting || null,
        'Date Of Dispatch': form.dateOfDispatch || null,
        'PO Copy': poCopyUrl,
      };

      const { error } = await supabase.from(TABLE_NAME).insert([insertPayload]);
      if (error) throw error;

      toast.success(`✅ Order ${nextOrderNo} submitted successfully!`);
      setForm(emptyForm);
      const fileInput = document.getElementById('poCopyInput');
      if (fileInput) fileInput.value = '';
      onOrderSubmitted?.();
      fetchNextOrderNo();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(`❌ Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package size={20}/> Receive Order Of Raw Material
          </h2>
          <p className="text-purple-200 text-sm mt-1">Fill in the order details below</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Order No – auto-generated */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Order No. <span className="text-gray-400 text-xs">(auto-generated)</span>
            </label>
            <input
              type="text"
              value={loadingOrderNo ? 'Generating…' : nextOrderNo}
              readOnly
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
            />
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Party Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.partyName}
                onChange={e => handleChange('partyName', e.target.value)}
                placeholder="Enter party name"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.productName}
                onChange={e => handleChange('productName', e.target.value)}
                placeholder="Enter product name"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.qty}
                onChange={e => handleChange('qty', e.target.value)}
                placeholder="Quantity"
                required
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.rate}
                onChange={e => handleChange('rate', e.target.value)}
                placeholder="Rate"
                required
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Type Of Transporting
              </label>
              <select
                value={form.typeOfTransporting}
                onChange={e => handleChange('typeOfTransporting', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition bg-white"
              >
                <option value="">Select Transport Type...</option>
                <option value="Ex factory">Ex factory</option>
                <option value="FOR">FOR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Date Of Dispatch
              </label>
              <input
                type="date"
                value={form.dateOfDispatch}
                onChange={e => handleChange('dateOfDispatch', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              PO Copy (Upload Image or PDF) <span className="text-red-500">*</span>
            </label>
            <input
              id="poCopyInput"
              type="file"
              accept="image/*,application/pdf"
              required
              onChange={e => setForm(prev => ({ ...prev, poCopyFile: e.target.files[0] }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting || loadingOrderNo}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <RefreshCw size={16} className="animate-spin"/> : <CheckCircle size={16}/>}
              {submitting ? 'Submitting…' : 'Submit Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Logistics modal form
// ═══════════════════════════════════════════════════════════════════════
const LogisticsModal = ({ row, onClose, onSaved }) => {
  const [form, setForm] = useState({
    transporterName: '',
    truckNo: '',
    biltyNo: '',
    actualTruckQty: '',
    typeOfRate: '',
  });
  const [saving, setSaving] = useState(false);
  const [transporters, setTransporters] = useState([]);
  const [loadingTransporters, setLoadingTransporters] = useState(true);

  const fetchTransporters = useCallback(async () => {
    try {
      setLoadingTransporters(true);
      const { data, error } = await supabase
        .from('Master')
        .select('"Transporter Name"')
        .not('"Transporter Name"', 'is', null);
      if (error) throw error;
      const uniqueTransporters = Array.from(new Set(data.map(item => item['Transporter Name'])));
      setTransporters(uniqueTransporters.filter(Boolean));
    } catch (err) {
      console.error('Error fetching transporters:', err);
    } finally {
      setLoadingTransporters(false);
    }
  }, []);

  useEffect(() => {
    fetchTransporters();
  }, [fetchTransporters]);

  const handleChange = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    const isExFactory = row['Type Of Transporting'] === 'Ex factory';
    
    if (isExFactory) {
      if (!form.transporterName || !form.truckNo) {
        toast.error('Please fill all required logistics fields.');
        return;
      }
    } else {
      if (!form.transporterName || !form.truckNo || !form.biltyNo || !form.actualTruckQty || !form.typeOfRate) {
        toast.error('Please fill all required logistics fields.');
        return;
      }
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({
          'Transporter Name': form.transporterName,
          'Truck No.': form.truckNo,
          'Bilty No.': form.biltyNo,
          'Actual Truck Qty': parseFloat(form.actualTruckQty) || null,
          'Type Of Rate': form.typeOfRate,
          'Actual 1': getIndianTimeForActuals(),
        })
        .eq('ID', row['ID']);

      if (error) throw error;
      toast.success(`✅ Logistics saved for Order ${row['Order No.']}`);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`❌ Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Arrange Logistics</h3>
            <p className="text-sm text-gray-500">Order: <span className="font-semibold text-purple-600">{row['Order No.']}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={22}/>
          </button>
        </div>

        {/* Order summary */}
        <div className="mx-6 mt-4 p-4 bg-purple-50 rounded-xl text-sm grid grid-cols-2 gap-2">
          <div><span className="text-gray-500">Party:</span> <span className="font-medium">{row['Party Name'] || '-'}</span></div>
          <div><span className="text-gray-500">Product:</span> <span className="font-medium">{row['Product Name'] || '-'}</span></div>
          <div><span className="text-gray-500">Qty:</span> <span className="font-medium">{row['Qty'] ?? '-'}</span></div>
          <div><span className="text-gray-500">Rate:</span> <span className="font-medium">{row['Rate'] ?? '-'}</span></div>
          <div><span className="text-gray-500">Transport Type:</span> <span className="font-medium">{row['Type Of Transporting'] || '-'}</span></div>
          <div><span className="text-gray-500">Dispatch Date:</span> <span className="font-medium">{row['Date Of Dispatch'] || '-'}</span></div>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {[
            { field: 'transporterName', label: 'Transporter Name', type: 'select', placeholder: 'Select transporter name' },
            { field: 'truckNo',         label: 'Truck No.',         type: 'text', placeholder: 'Enter truck number' },
            { field: 'biltyNo',         label: 'Bilty No.',         type: 'text', placeholder: 'Enter bilty number' },
            { field: 'actualTruckQty',  label: 'Actual Truck Qty',  type: 'number', placeholder: 'Enter actual truck qty' },
            { field: 'typeOfRate',      label: 'Type Of Rate',      type: 'text', placeholder: 'e.g. Fixed, Variable' },
          ].filter(f => {
            if (row['Type Of Transporting'] === 'Ex factory') {
              return f.field === 'transporterName' || f.field === 'truckNo';
            }
            return true;
          }).map(f => (
            <div key={f.field}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {f.label} <span className="text-red-500">*</span>
              </label>
              {f.type === 'select' ? (
                <select
                  value={form[f.field]}
                  onChange={e => handleChange(f.field, e.target.value)}
                  disabled={loadingTransporters}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition bg-white"
                >
                  <option value="">{loadingTransporters ? 'Loading transporters...' : 'Select Transporter Name...'}</option>
                  {transporters.map((t, i) => (
                    <option key={i} value={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  value={form[f.field]}
                  onChange={e => handleChange(f.field, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition disabled:opacity-60"
          >
            {saving ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
            {saving ? 'Saving…' : 'Save Logistics'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Reusable DataTable
// ═══════════════════════════════════════════════════════════════════════
const DataTable = ({ columns, data, emptyText }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-200">
    <table className="w-full min-w-max text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          {columns.map(col => (
            <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle size={32} className="text-gray-300"/>
                <span>{emptyText || 'No data found'}</span>
              </div>
            </td>
          </tr>
        ) : (
          data.map((row, idx) => (
            <tr key={row['ID'] ?? idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-800">
                  {col.render ? col.render(row) : (row[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// TAB 2 – Arrange Logistics
// ═══════════════════════════════════════════════════════════════════════
const ArrangeLogisticsTab = () => {
  const [subTab,   setSubTab]   = useState('pending');
  const [pending,  setPending]  = useState([]);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modalRow, setModalRow] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Pending: Planned1 not null AND Actual1 is null
      const { data: pData, error: pErr } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('Planned 1', 'is', null)
        .is('Actual 1', null)
        .order('ID', { ascending: false });

      if (pErr) throw pErr;
      setPending(pData || []);

      // History: both Planned1 and Actual1 not null
      const { data: hData, error: hErr } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('Planned 1', 'is', null)
        .not('Actual 1', 'is', null)
        .order('ID', { ascending: false });

      if (hErr) throw hErr;
      setHistory(hData || []);
    } catch (err) {
      console.error('Fetch logistics error:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const baseColumns = [
    { key: 'action_col', label: 'Action', render: (row) => (
      <button
        onClick={() => setModalRow(row)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition"
      >
        <Truck size={12}/> Action
      </button>
    )},
    { key: 'Order No.',          label: 'Order No.' },
    { key: 'Planned 1',          label: 'Planned 1',        render: r => formatDisplayDate(r['Planned 1']) },
    { key: 'Party Name',         label: 'Party Name' },
    { key: 'Product Name',       label: 'Product Name' },
    { key: 'Qty',                label: 'Qty' },
    { key: 'Rate',               label: 'Rate' },
    { key: 'Type Of Transporting', label: 'Type Of Transporting' },
    { key: 'Date Of Dispatch',   label: 'Date Of Dispatch' },
    { key: 'PO Copy',            label: 'PO Copy', render: r => {
      const url = r['PO Copy'];
      if (!url) return '-';
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline text-xs font-medium">
          {url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
            <img src={url} alt="PO Copy" className="h-10 w-10 object-cover rounded shadow-sm border border-gray-200" />
          ) : (
            'View File'
          )}
        </a>
      );
    } },
  ];

  const historyColumns = [
    { key: 'Order No.',          label: 'Order No.' },
    { key: 'Planned 1',          label: 'Planned 1',        render: r => formatDisplayDate(r['Planned 1']) },
    { key: 'Party Name',         label: 'Party Name' },
    { key: 'Product Name',       label: 'Product Name' },
    { key: 'Qty',                label: 'Qty' },
    { key: 'Rate',               label: 'Rate' },
    { key: 'Type Of Transporting', label: 'Type Of Transporting' },
    { key: 'Date Of Dispatch',   label: 'Date Of Dispatch' },
    { key: 'PO Copy',            label: 'PO Copy', render: r => {
      const url = r['PO Copy'];
      if (!url) return '-';
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline text-xs font-medium">
          {url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
            <img src={url} alt="PO Copy" className="h-10 w-10 object-cover rounded shadow-sm border border-gray-200" />
          ) : (
            'View File'
          )}
        </a>
      );
    } },
    { key: 'Actual 1',           label: 'Actual 1',         render: r => formatDisplayDate(r['Actual 1']) },
    { key: 'Transporter Name',   label: 'Transporter Name' },
    { key: 'Truck No.',          label: 'Truck No.' },
    { key: 'Bilty No.',          label: 'Bilty No.' },
    { key: 'Actual Truck Qty',   label: 'Actual Truck Qty' },
    { key: 'Type Of Rate',       label: 'Type Of Rate' },
  ];

  return (
    <div className="p-6">
      {modalRow && (
        <LogisticsModal
          row={modalRow}
          onClose={() => setModalRow(null)}
          onSaved={fetchData}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Truck size={20}/> Arrange Logistics
            </h2>
            <p className="text-purple-200 text-sm mt-1">Manage transportation for pending orders</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition"
          >
            <RefreshCw size={14}/> Refresh
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4 gap-1">
          {[
            { id: 'pending', label: 'Pending', icon: <Clock size={14}/>, count: pending.length },
            { id: 'history', label: 'History', icon: <History size={14}/>, count: history.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-150 ${
                subTab === t.id
                  ? 'border-purple-600 text-purple-700 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.icon} {t.label}
              <span className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-xs font-bold ${
                subTab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={28} className="animate-spin mr-3"/> Loading…
            </div>
          ) : (
            <>
              {subTab === 'pending' && (
                <DataTable
                  columns={baseColumns}
                  data={pending}
                  emptyText="No pending logistics items"
                />
              )}
              {subTab === 'history' && (
                <DataTable
                  columns={historyColumns}
                  data={history}
                  emptyText="No history records yet"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Invoice modal form
// ═══════════════════════════════════════════════════════════════════════
const InvoiceModal = ({ row, onClose, onSaved }) => {
  const [billFile, setBillFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!billFile) {
      toast.error('Please attach the bill image or PDF.');
      return;
    }
    setSaving(true);
    try {
      toast.info('Uploading Bill...');
      const fileExt = billFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `sales of raw material/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('image')
        .upload(filePath, billFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('image')
        .getPublicUrl(filePath);

      const billUrl = publicUrlData.publicUrl;

      // Note: Assumes an "Invoice Copy" column exists in the table to store the bill link.
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ 
          'Actual 2': getIndianTimeForActuals(),
          'Invoice Copy': billUrl
        })
        .eq('ID', row['ID']);

      if (error) throw error;
      toast.success(`✅ Invoice marked and bill uploaded for Order ${row['Order No.']}`);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Invoice save error:', err);
      toast.error(`❌ Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Attach Bill</h3>
            <p className="text-sm text-gray-500">Order: <span className="font-semibold text-purple-600">{row['Order No.']}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={22}/>
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Bill Image or PDF <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={e => setBillFile(e.target.files[0])}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
          />
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition disabled:opacity-60"
          >
            {saving ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// TAB 3 – Make Invoice
// ═══════════════════════════════════════════════════════════════════════
const MakeInvoiceTab = () => {
  const [subTab,  setSubTab]  = useState('pending');
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalRow, setModalRow] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Pending: Planned2 not null AND Actual2 is null
      const { data: pData, error: pErr } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('Planned 2', 'is', null)
        .is('Actual 2', null)
        .order('ID', { ascending: false });

      if (pErr) throw pErr;
      setPending(pData || []);

      // History: both Planned2 and Actual2 not null
      const { data: hData, error: hErr } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('Planned 2', 'is', null)
        .not('Actual 2', 'is', null)
        .order('ID', { ascending: false });

      if (hErr) throw hErr;
      setHistory(hData || []);
    } catch (err) {
      console.error('Fetch invoice error:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingColumns = [
    { key: 'action_col', label: 'Action', render: (row) => (
      <button
        onClick={() => setModalRow(row)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition"
      >
        <FileText size={12}/> Attach Bill
      </button>
    )},
    { key: 'Order No.',        label: 'Order No.' },
    { key: 'Planned 2',        label: 'Planned 2',      render: r => formatDisplayDate(r['Planned 2']) },
    { key: 'Party Name',       label: 'Party Name' },
    { key: 'Product Name',     label: 'Product Name' },
    { key: 'Qty',              label: 'Qty' },
    { key: 'Rate',             label: 'Rate' },
    { key: 'Transporter Name', label: 'Transporter Name' },
    { key: 'Truck No.',        label: 'Truck No.' },
    { key: 'Bilty No.',        label: 'Bilty No.' },
    { key: 'Actual Truck Qty', label: 'Actual Truck Qty' },
    { key: 'Type Of Rate',     label: 'Type Of Rate' },
  ];

  const historyColumns = [
    { key: 'Order No.',        label: 'Order No.' },
    { key: 'Planned 2',        label: 'Planned 2',      render: r => formatDisplayDate(r['Planned 2']) },
    { key: 'Party Name',       label: 'Party Name' },
    { key: 'Product Name',     label: 'Product Name' },
    { key: 'Qty',              label: 'Qty' },
    { key: 'Rate',             label: 'Rate' },
    { key: 'Transporter Name', label: 'Transporter Name' },
    { key: 'Truck No.',        label: 'Truck No.' },
    { key: 'Bilty No.',        label: 'Bilty No.' },
    { key: 'Actual Truck Qty', label: 'Actual Truck Qty' },
    { key: 'Type Of Rate',     label: 'Type Of Rate' },
    { key: 'Invoice Copy',     label: 'Invoice Copy', render: r => {
      const url = r['Invoice Copy'];
      if (!url) return '-';
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 underline text-xs font-medium">
          {url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
            <img src={url} alt="Bill" className="h-10 w-10 object-cover rounded shadow-sm border border-gray-200" />
          ) : (
            'View Bill'
          )}
        </a>
      );
    } },
    { key: 'Actual 2',         label: 'Actual 2',       render: r => formatDisplayDate(r['Actual 2']) },
  ];

  return (
    <div className="p-6">
      {modalRow && (
        <InvoiceModal
          row={modalRow}
          onClose={() => setModalRow(null)}
          onSaved={fetchData}
        />
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText size={20}/> Make Invoice
            </h2>
            <p className="text-purple-200 text-sm mt-1">Mark invoices for completed logistics</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition"
          >
            <RefreshCw size={14}/> Refresh
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4 gap-1">
          {[
            { id: 'pending', label: 'Pending', icon: <Clock size={14}/>, count: pending.length },
            { id: 'history', label: 'History', icon: <History size={14}/>, count: history.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-150 ${
                subTab === t.id
                  ? 'border-purple-600 text-purple-700 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.icon} {t.label}
              <span className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-xs font-bold ${
                subTab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={28} className="animate-spin mr-3"/> Loading…
            </div>
          ) : (
            <>
              {subTab === 'pending' && (
                <DataTable
                  columns={pendingColumns}
                  data={pending}
                  emptyText="No pending invoice items"
                />
              )}
              {subTab === 'history' && (
                <DataTable
                  columns={historyColumns}
                  data={history}
                  emptyText="No invoice history yet"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
const MakePaymentTab = () => {
  const [subTab,  setSubTab]  = useState('pending');
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Pending: Planned3 not null AND Actual3 is null
      const { data: pData, error: pErr } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('Planned 3', 'is', null)
        .is('Actual 3', null)
        .order('ID', { ascending: false });

      if (pErr) throw pErr;
      setPending(pData || []);

      // History: both Planned3 and Actual3 not null
      const { data: hData, error: hErr } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('Planned 3', 'is', null)
        .not('Actual 3', 'is', null)
        .order('ID', { ascending: false });

      if (hErr) throw hErr;
      setHistory(hData || []);
    } catch (err) {
      console.error('Fetch payment error:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkPayment = async (row) => {
    const rowId = row['ID'];
    setChecking(prev => ({ ...prev, [rowId]: true }));
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ 'Actual 3': getIndianTimeForActuals() })
        .eq('ID', rowId);

      if (error) throw error;
      toast.success(`✅ Payment marked done for Order ${row['Order No.']}`);
      fetchData();
    } catch (err) {
      console.error('Payment mark error:', err);
      toast.error(`❌ Failed: ${err.message}`);
    } finally {
      setChecking(prev => ({ ...prev, [rowId]: false }));
    }
  };

  const getCommonColumns = () => [
    { key: 'Order No.',        label: 'Order No.' },
    { key: 'Planned 3',        label: 'Planned 3',      render: r => formatDisplayDate(r['Planned 3']) },
    { key: 'Party Name',       label: 'Party Name' },
    { key: 'Product Name',     label: 'Product Name' },
    { key: 'Qty',              label: 'Qty' },
    { key: 'Rate',             label: 'Rate' },
    { key: 'Transporter Name', label: 'Transporter Name' },
    { key: 'Truck No.',        label: 'Truck No.' },
    { key: 'Bilty No.',        label: 'Bilty No.' },
    { key: 'Actual Truck Qty', label: 'Actual Truck Qty' },
    { key: 'Type Of Rate',     label: 'Type Of Rate' },
  ];

  const pendingColumns = [
    { key: 'action_col', label: 'Mark Done', render: (row) => (
      <label className="flex items-center gap-2 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            checked={false}
            onChange={() => handleMarkPayment(row)}
            disabled={checking[row['ID']]}
            className="sr-only peer"
          />
          <div className="w-5 h-5 border-2 border-purple-400 rounded peer-checked:bg-purple-600 peer-checked:border-purple-600 transition flex items-center justify-center hover:border-purple-600 cursor-pointer">
            {checking[row['ID']] && <RefreshCw size={10} className="animate-spin text-purple-600"/>}
          </div>
        </div>
        <span className="text-xs text-gray-500">Done</span>
      </label>
    )},
    { key: 'Payment Link',     label: 'Google Form', render: r => {
      const link = r['Payment Link'];
      if (!link) return '-';
      return (
        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 underline text-xs font-semibold">
          <CreditCard size={12}/> Open Form
        </a>
      );
    } },
    ...getCommonColumns(),
  ];

  const historyColumns = [
    ...getCommonColumns(),
    { key: 'Actual 3',         label: 'Actual 3',       render: r => formatDisplayDate(r['Actual 3']) },
  ];

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard size={20}/> Make Payment
            </h2>
            <p className="text-purple-200 text-sm mt-1">Mark payments done</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition"
          >
            <RefreshCw size={14}/> Refresh
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4 gap-1">
          {[
            { id: 'pending', label: 'Pending', icon: <Clock size={14}/>, count: pending.length },
            { id: 'history', label: 'History', icon: <History size={14}/>, count: history.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-150 ${
                subTab === t.id
                  ? 'border-purple-600 text-purple-700 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.icon} {t.label}
              <span className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-xs font-bold ${
                subTab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={28} className="animate-spin mr-3"/> Loading…
            </div>
          ) : (
            <>
              {subTab === 'pending' && (
                <DataTable
                  columns={pendingColumns}
                  data={pending}
                  emptyText="No pending payments found"
                />
              )}
              {subTab === 'history' && (
                <DataTable
                  columns={historyColumns}
                  data={history}
                  emptyText="No payment history yet"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Root component
// ═══════════════════════════════════════════════════════════════════════
const SaleOfRawMaterial = () => {
  const [activeTab, setActiveTab] = useState('receive-order');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Sale Of Raw Material</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage raw material sales from order to payment</p>
      </div>

      {/* Main tab bar */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-150 ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[calc(100vh-10rem)]">
        {activeTab === 'receive-order'     && <ReceiveOrderTab onOrderSubmitted={() => {}}/>}
        {activeTab === 'arrange-logistics' && <ArrangeLogisticsTab/>}
        {activeTab === 'make-invoice'      && <MakeInvoiceTab/>}
        {activeTab === 'make-payment'      && <MakePaymentTab/>}
      </div>
    </div>
  );
};

export default SaleOfRawMaterial;
