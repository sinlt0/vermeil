// ============================================================
//  utils/ecoShopUtils.js
//  Shop + Inventory helpers
// ============================================================

// ============================================================
//  Get item by ID from shop config
// ============================================================
function getShopItem(itemId) {
  const shopConfig = require("../ecoconfiguration/shop");
  for (const category of shopConfig.categories) {
    const item = category.items.find(i => i.id === itemId);
    if (item) return { ...item, category: category.name };
  }
  return null;
}

// ============================================================
//  Get all items in a category
// ============================================================
function getCategory(categoryName) {
  const shopConfig = require("../ecoconfiguration/shop");
  return shopConfig.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase()) ?? null;
}

// ============================================================
//  Add item to user inventory
// ============================================================
async function addItem(client, userId, itemId, quantity = 1) {
  const Inventory = client.ecoDb.getModel("Inventory");
  const item      = getShopItem(itemId);
  if (!item) return false;

  const inv = await Inventory.findOne({ userId });
  if (!inv) {
    await Inventory.create({ userId, items: [{ itemId, name: item.name, quantity }] });
    return true;
  }

  const existing = inv.items.find(i => i.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    inv.items.push({ itemId, name: item.name, quantity });
  }
  await inv.save();
  return true;
}

// ============================================================
//  Remove item from inventory
// ============================================================
async function removeItem(client, userId, itemId, quantity = 1) {
  const Inventory = client.ecoDb.getModel("Inventory");
  const inv       = await Inventory.findOne({ userId });
  if (!inv) return false;

  const existing = inv.items.find(i => i.itemId === itemId);
  if (!existing || existing.quantity < quantity) return false;

  existing.quantity -= quantity;
  if (existing.quantity <= 0) {
    inv.items = inv.items.filter(i => i.itemId !== itemId);
  }
  await inv.save();
  return true;
}

// ============================================================
//  Check if user has item
// ============================================================
async function hasItem(client, userId, itemId, quantity = 1) {
  const Inventory = client.ecoDb.getModel("Inventory");
  const inv       = await Inventory.findOne({ userId }).lean();
  if (!inv) return false;
  const item = inv.items?.find(i => i.itemId === itemId);
  return (item?.quantity ?? 0) >= quantity;
}

// ============================================================
//  Use an item — applies effect
// ============================================================
async function useItem(client, userId, itemId) {
  const item = getShopItem(itemId);
  if (!item) return { success: false, msg: "Item not found." };

  const hasIt = await hasItem(client, userId, itemId);
  if (!hasIt) return { success: false, msg: "You don't have that item." };

  // Apply effect based on item type
  let result = { success: true, msg: "", effect: item.effect };

  switch (item.effect?.type) {
    case "rob_protection": {
      const duration = item.effect.duration ?? 3600000; // default 1h
      const expiry   = new Date(Date.now() + duration);
      const UP       = client.ecoDb.getModel("Userprofile");
      await UP.findOneAndUpdate({ userId }, { $set: { robProtection: true, robProtectionExp: expiry } });
      result.msg = `Rob protection active for ${Math.floor(duration / 60000)} minutes!`;
      break;
    }
    case "bank_expansion": {
      const amount = item.effect.amount ?? 5000;
      const UP     = client.ecoDb.getModel("Userprofile");
      const bankCfg = require("../ecoconfiguration/bank");
      const profile = await UP.findOne({ userId });
      const current = profile?.bankLimit ?? bankCfg.defaultLimit;
      await UP.findOneAndUpdate({ userId }, { $set: { bankLimit: current + amount } });
      result.msg = `Bank limit increased by ${amount.toLocaleString()} coins!`;
      break;
    }
    case "xp_boost": {
      result.msg = "XP boost applied for your next activity!";
      break;
    }
    default:
      result.msg = `Used ${item.name}!`;
  }

  await removeItem(client, userId, itemId, 1);
  return result;
}

module.exports = { getShopItem, getCategory, addItem, removeItem, hasItem, useItem };
