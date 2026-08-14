/** 訂位狀態直接反映試算表原意：TRUE=已訂位、FALSE=未訂位、空值=不適用（不強行視為未訂位）。 */
export function parseDining(rows) {
  return rows.map(r => ({
    date: r['日期'] || '',
    city: r['城市'] || '',
    name: r['餐廳/地點'] || '',
    meal: r['餐別'] || '',
    reserved: r['預約狀態'] === 'TRUE' ? true : r['預約狀態'] === 'FALSE' ? false : null,
    note: r['備註'] || '',
  }));
}

/**
 * 北海道拉麵三大天王：旭川醬油、函館鹽味、札幌味噌。
 * 流派來自 places.json 的 ramen 欄，不以店名或備註字串猜測。
 */
export function ramenTrio(dishes, resolve) {
  return dishes
    .map(d => ({ dish: d, place: d.name ? resolve(d.name) : null }))
    .filter(({ place }) => place?.ramen)
    .map(({ dish, place }) => ({
      flavor: place.ramen,
      name: dish.name,
      city: dish.city,
      date: dish.date,
      meal: dish.meal,
      photo: place.photo,
    }));
}
