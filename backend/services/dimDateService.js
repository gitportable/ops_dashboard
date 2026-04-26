const pool = require("../db");

exports.generateDimDate = async () => {
  const start = new Date("2015-01-01");
  const end = new Date("2035-12-31");

  let current = start;

  while (current <= end) {
    const dateKey = current.toISOString().slice(0,10).replace(/-/g,"");
    await pool.query(
      `INSERT INTO dimdate(datekey, date, year, month)
       VALUES($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      [
        dateKey,
        current,
        current.getFullYear(),
        current.getMonth() + 1
      ]
    );
    current.setDate(current.getDate() + 1);
  }
};