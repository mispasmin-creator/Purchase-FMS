import { useState } from "react";
import { ShieldCheck, Save, X, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "../supabase";
import { uploadFileToStorage } from "../utils/storageUtils";
import { toast } from "sonner";

/**
 * Reusable Super Admin edit modal.
 * Props:
 *   title       - Modal heading string
 *   tableName   - Supabase table name
 *   pkField     - Primary key column name (e.g. "id")
 *   pkValue     - Primary key value of the row being edited
 *   fields      - Array of { label, dbKey, value, type, folder? }
 *                 type: "text" | "number" | "date" | "textarea" | "select" | "file"
 *                 For "select", also pass options: string[]
 *                 For "file", folder is the storage subfolder (e.g. "bill-images")
 *   onClose     - Called when user cancels
 *   onSaved     - Called after successful save (refresh parent)
 */
export default function SuperAdminEditModal({
  title,
  tableName,
  pkField,
  pkValue,
  fields,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => {
    const init = {};
    fields.forEach((f) => {
      init[f.dbKey] = f.value ?? "";
    });
    return init;
  });
  // Track pending file uploads: { [dbKey]: File }
  const [pendingFiles, setPendingFiles] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Group payload by table
      const updates = {
        [tableName]: {
          payload: {},
          pkField: pkField,
          pkValue: pkValue
        }
      };

      const getOrCreateUpdate = (tName, fieldPkCol, fieldPkVal) => {
        if (!updates[tName]) {
          updates[tName] = {
            payload: {},
            pkField: fieldPkCol,
            pkValue: fieldPkVal
          };
        }
        return updates[tName];
      };

      fields.forEach((f) => {
        if (f.readOnly || f.skipSave) return;

        if (f.type !== "file") {
          const targetTable = f.customTable || tableName;
          const targetPkField = f.customPkField || pkField;
          const targetPkValue = f.customPkValue || pkValue;
          const dbKeyToUse = f.saveDbKey || f.dbKey;

          const u = getOrCreateUpdate(targetTable, targetPkField, targetPkValue);
          u.payload[dbKeyToUse] = form[f.dbKey] === "" ? null : form[f.dbKey];
        }
      });

      // Upload any pending files and add their URLs to payload
      for (const f of fields) {
        if (f.readOnly || f.skipSave) continue;

        if (f.type === "file") {
          const targetTable = f.customTable || tableName;
          const targetPkField = f.customPkField || pkField;
          const targetPkValue = f.customPkValue || pkValue;
          const dbKeyToUse = f.saveDbKey || f.dbKey;

          const u = getOrCreateUpdate(targetTable, targetPkField, targetPkValue);

          if (pendingFiles[f.dbKey]) {
            const { url } = await uploadFileToStorage(
              pendingFiles[f.dbKey],
              "image",
              f.folder || "sa-uploads",
            );
            u.payload[dbKeyToUse] = url;
          } else {
            // Keep existing URL unchanged
            u.payload[dbKeyToUse] = form[f.dbKey];
          }
        }
      }

      // Execute updates for all targeted tables
      for (const tName of Object.keys(updates)) {
        const u = updates[tName];
        if (Object.keys(u.payload).length === 0) continue;

        console.log(`[SuperAdmin] Updating table ${tName} where ${u.pkField} = ${u.pkValue}:`, u.payload);

        const { error } = await supabase
          .from(tName)
          .update(u.payload)
          .eq(u.pkField, u.pkValue);

        if (error) throw error;
      }

      toast.success(`Record updated successfully`);
      onSaved();
    } catch (err) {
      console.error("SuperAdmin save error:", err);
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-600" />
            <span className="text-base font-semibold text-gray-900">{title || "Super Admin Edit"}</span>
            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              Super Admin
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.dbKey} className={f.type === "textarea" || f.type === "file" ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={form[f.dbKey] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.dbKey]: e.target.value }))}
                    disabled={f.readOnly}
                    className={`w-full px-2.5 py-1.5 text-sm border border-purple-200 rounded-md focus:ring-1 focus:ring-purple-400 focus:border-purple-400 resize-none ${f.readOnly ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`}
                  />
                ) : f.type === "select" ? (
                  <select
                    value={form[f.dbKey] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.dbKey]: e.target.value }))}
                    disabled={f.readOnly}
                    className={`w-full px-2.5 py-1.5 text-sm border border-purple-200 rounded-md focus:ring-1 focus:ring-purple-400 focus:border-purple-400 bg-white ${f.readOnly ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`}
                  >
                    {(f.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : f.type === "file" ? (
                  <div className="space-y-2">
                    {form[f.dbKey] && String(form[f.dbKey]).startsWith("http") && !pendingFiles[f.dbKey] && (
                      <a
                        href={form[f.dbKey]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
                      >
                        <ExternalLink size={12} /> View current file
                      </a>
                    )}
                    {pendingFiles[f.dbKey] && (
                      <p className="text-xs text-green-600">
                        Selected: {pendingFiles[f.dbKey].name}
                      </p>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      disabled={f.readOnly}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPendingFiles((p) => ({ ...p, [f.dbKey]: file }));
                      }}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border border-purple-200 rounded-md p-1"
                    />
                  </div>
                ) : (
                  <input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={form[f.dbKey] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.dbKey]: e.target.value }))}
                    disabled={f.readOnly}
                    className={`w-full px-2.5 py-1.5 text-sm border border-purple-200 rounded-md focus:ring-1 focus:ring-purple-400 focus:border-purple-400 ${f.readOnly ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
