-- Migration script: Fix old orders where total_price doesn't include shipping_fee
-- 
-- 問題說明：
-- 舊訂單的 total_price 可能未包含 shipping_fee，導致應收/應付金額計算錯誤
--
-- 此腳本會更新以下訂單：
-- 1. 有 shipping_fee > 0 的訂單
-- 2. total_price 尚未包含 shipping_fee 的訂單
--
-- 注意：此腳本假設舊訂單的 total_price 是純商品金額（不含運費）
-- 如果舊訂單的 total_price 已經包含運費，請勿執行此腳本
--
-- 建議：在執行前先備份資料，並檢查是否有訂單需要更新

-- 檢視需要更新的訂單（不會實際更新，僅顯示）
-- SELECT id, total_price, shipping_fee, total_price + shipping_fee as new_total
-- FROM orders
-- WHERE shipping_fee > 0
--   AND type IN ('sale', 'sale_return');

-- 更新銷貨訂單的 total_price（加入 shipping_fee）
-- 注意：此更新假設舊 total_price 不含運費
-- 如果您的訂單已經包含運費，請跳過此步驟
/*
UPDATE orders
SET total_price = total_price + shipping_fee
WHERE shipping_fee > 0
  AND type IN ('sale', 'sale_return')
  AND total_price IS NOT NULL;
*/

-- 對於進貨訂單，應付金額的計算邏輯已在程式碼中修正為：
-- cost + shipping_fee（或 SUM(order_items.subtotal) + shipping_fee）
-- 因此進貨訂單不需要更新 total_price 欄位

-- 驗證查詢：檢查修正後的結果
-- SELECT 
--   type,
--   COUNT(*) as order_count,
--   SUM(COALESCE(shipping_fee, 0)) as total_shipping
-- FROM orders
-- GROUP BY type;
