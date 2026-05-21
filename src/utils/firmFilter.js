/**
 * Firm-based filtering utilities
 * Used to filter data based on user's firm from Login table
 */

/**
 * Check if user can view data for a specific firm
 * @param {string|string[]} userFirmName - User's firm(s) from Login table (stored in user.firmName)
 * @param {string} dataFirmName - Firm name in the data record
 * @param {string} [pageName] - Active page name to look up page-specific permissions
 * @param {object} [userPageFirms] - Page-to-firms mapping (stored in user.pageFirms)
 * @returns {boolean} - True if user can view this data
 */
export function canViewFirm(userFirmName, dataFirmName, pageName = null, userPageFirms = null) {
    let activeUserFirm = userFirmName;

    if (pageName && userPageFirms) {
        const pageFirmsList = userPageFirms[pageName];
        if (pageFirmsList && Array.isArray(pageFirmsList)) {
            activeUserFirm = pageFirmsList;
        }
    }

    if (!activeUserFirm) return true;

    const normalizedUserFirm = Array.isArray(activeUserFirm) 
        ? activeUserFirm.map(f => String(f || "").toLowerCase().trim())
        : String(activeUserFirm || "").toLowerCase().trim();

    // If user has "all" access, show everything
    if (normalizedUserFirm === "all" || (Array.isArray(normalizedUserFirm) && normalizedUserFirm.includes("all"))) {
        return true;
    }

    // If data has no firm name, show it (as it's not restricted)
    if (!dataFirmName) {
        return true;
    }

    const normalizedDataFirm = String(dataFirmName || "").toLowerCase().trim();

    // Support both single string and array of firms for user
    if (Array.isArray(normalizedUserFirm)) {
        return normalizedUserFirm.includes(normalizedDataFirm);
    }

    return normalizedUserFirm === normalizedDataFirm;
}

/**
 * Apply firm filter to Supabase query
 * @param {object} query - Supabase query builder
 * @param {string|string[]} firmName - User's firm name(s)
 * @param {string} columnName - Column name in table (default: "Firm Name")
 * @param {string} [pageName] - Active page name to look up page-specific permissions
 * @param {object} [userPageFirms] - Page-to-firms mapping (stored in user.pageFirms)
 * @returns {object} - Updated query with firm filter applied
 */
export function applyFirmFilter(query, firmName, columnName = "Firm Name", pageName = null, userPageFirms = null) {
    let activeFirmName = firmName;

    if (pageName && userPageFirms) {
        const pageFirmsList = userPageFirms[pageName];
        if (pageFirmsList && Array.isArray(pageFirmsList)) {
            activeFirmName = pageFirmsList;
        }
    }

    if (!activeFirmName) return query;

    // If user has "all" access, no filtering needed
    if (activeFirmName === "all" || (Array.isArray(activeFirmName) && activeFirmName.map(f => f.toLowerCase().trim()).includes("all"))) {
        return query;
    }

    // Handle multiple firms via .in() operator
    if (Array.isArray(activeFirmName)) {
        return query.in(columnName, activeFirmName);
    }

    // Apply single firm filter
    return query.eq(columnName, activeFirmName);
}

/**
 * Filter array data client-side based on firm
 * @param {Array} data - Array of data objects
 * @param {string|string[]} userFirmName - User's firm name(s)
 * @param {string} firmFieldName - Field name containing firm (default: "Firm Name")
 * @param {string} [pageName] - Active page name to look up page-specific permissions
 * @param {object} [userPageFirms] - Page-to-firms mapping (stored in user.pageFirms)
 * @returns {Array} - Filtered data
 */
export function filterByFirm(data, userFirmName, firmFieldName = "Firm Name", pageName = null, userPageFirms = null) {
    if (!data || !Array.isArray(data)) return [];
    if (!userFirmName && !(pageName && userPageFirms)) return data;

    // Filter data by firm using the canViewFirm utility
    return data.filter(item => canViewFirm(userFirmName, item[firmFieldName], pageName, userPageFirms));
}
