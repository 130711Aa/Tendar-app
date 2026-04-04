export const PLAN_LIMITS = {
  free: {
    maxProducts: 10,
    maxStaff: 1,
    posEnabled: false,
    inventoryEnabled: false,
    bomEnabled: false,
    analyticsEnabled: false,
    categoryManagement: false,
    productImages: false,
    exportCsv: false,
    exportExcel: false,
    printer: false
  },
  starter: {
    maxProducts: 30,
    maxStaff: 1,
    posEnabled: false,
    inventoryEnabled: false,
    bomEnabled: false,
    analyticsEnabled: false,
    categoryManagement: true,
    productImages: true,
    exportCsv: false,
    exportExcel: false,
    printer: false
  },
  business: {
    maxProducts: Infinity,
    maxStaff: 2,
    posEnabled: true,
    inventoryEnabled: true,
    bomEnabled: false,
    analyticsEnabled: true,
    categoryManagement: true,
    productImages: true,
    exportCsv: true,
    exportExcel: false,
    printer: true
  },
  pro: {
    maxProducts: Infinity,
    maxStaff: Infinity,
    posEnabled: true,
    inventoryEnabled: true,
    bomEnabled: true,
    analyticsEnabled: true,
    categoryManagement: true,
    productImages: true,
    exportCsv: true,
    exportExcel: true,
    printer: true
  }
}
