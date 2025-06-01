const {
  Transaction,
  DetailTransaction,
  User,
  Flight,
  Passenger,
  Ticket,
} = require("../../models");
const crypto = require("crypto");
const imagekit = require("../../utils/imagekit");
const qr = require("qr-image");
const puppeteer = require("puppeteer");
const email1 = require("../../utils/sendEmail");

const { CHROMIUM_PATH } = process.env;

module.exports = {
  createTransaction: async (req, res, next) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { isPaid = 0, flight_id, passenger } = req.body;
        const user = req.user;
        var payment_code = crypto.randomBytes(20).toString("hex");
        const countPassenger = passenger.length;
        const transaction = await Transaction.create({
          user_id: user.id,
          isPaid,
          payment_code,
          total: countPassenger,
        });

        let detailTransaction = await DetailTransaction.findOne({
          where: { transaction_id: transaction.id },
        });

        if (detailTransaction) {
          return res.status(400).json({
            status: false,
            message: "Wrong! Duplicate Transaction",
          });
        } else {
          detailTransaction = await DetailTransaction.create({
            transaction_id: transaction.id,
            flight_id,
          });
        }

        const passengers = await Passenger.bulkCreate(
          passenger.map((item) => ({
            ...item,
            detail_transaction_id: detailTransaction.id,
          }))
        );

        const result = {
          success: true,
          message: "Transaction created successfully",
          data: {
            transaction: {
              ...transaction.dataValues,
              detail_transaction: {
                ...detailTransaction.dataValues,
                passenger: passengers.map((item) => ({
                  ...item.dataValues,
                })),
              },
            },
          },
        };

        resolve(res.json(result));
      } catch (error) {
        next(error);
      }
    });
  },

  //get history transaksi user
  getHistoryTransactionByUserId: async (req, res, next) => {
    return new Promise(async (resolve, reject) => {
      try {
        const exist = await Transaction.findAll({
          where: { user_id: req.user.id },
          include: [
            {
              model: DetailTransaction,
              as: "detail_transaction",
              attributes: {
                exclude: ["createdAt", "updatedAt"],
              },
              include: [
                {
                  model: Flight,
                  as: "flight",
                  attributes: {
                    exclude: ["createdAt", "updatedAt"],
                  },
                },
                {
                  model: Passenger,
                  as: "passenger",
                  attributes: {
                    exclude: ["createdAt", "updatedAt"],
                  },
                },
                {
                  model: Ticket,
                  as: "tiket",
                  attributes: {
                    exclude: ["createdAt", "updatedAt"],
                  },
                },
              ],
            },
            // {
            //   model: User,
            //   as: "user_transaction",
            //   attributes: {
            //     exclude: [
            //       "id",
            //       "createdAt",
            //       "updatedAt",
            //       "password",
            //       "thumbnail",
            //     ],
            //   },
            // },
          ],
          attributes: {
            exclude: [
              "user_id",
              "createdAt",
              "updatedAt",
              "detail_transaction",
            ],
          },
        });

        if (!exist) {
          return resolve(
            res.status(400).json({
              status: false,
              message: "Transaction not found",
            })
          );
        }

        resolve(
          res.status(200).json({
            status: true,
            message: "Success get all transaction",
            data: exist,
          })
        );
      } catch (error) {
        next(error);
      }
    });
  },

  show: async (req, res, next) => {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await Transaction.findAll({
          include: [
            {
              model: User,
              as: "user_transaction",
              attributes: ["username", "email"],
            },
            {
              model: DetailTransaction,
              attributes: ["transaction_id"],
              as: "detail_transaction",
              include: [
                {
                  model: Flight,
                  attributes: {
                    exclude: ["id", "createdAt", "updatedAt"],
                  },
                  as: "flight",
                },
                {
                  model: Passenger,
                  attributes: {
                    exclude: ["id", "createdAt", "updatedAt"],
                  },
                  as: "passenger",
                },
              ],
            },
          ],
          attributes: {
            exclude: [
              "id",
              "user_id",
              "createdAt",
              "updatedAt",
              "detail_transaction",
            ],
          },
        });
        const result = {
          success: true,
          message: "Transaction data retrieved successfully",
          data,
        };
        resolve(res.json(result));
      } catch (error) {
        next(error);
      }
    });
  },

  update: async (req, res, next) => {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
      const { user_id, isPaid, roundTrip, oneWay } = req.body;
      try {
        const exist = await Transaction.findOne({ where: { id } });

        if (!exist) {
          return resolve(
            res.status(400).json({
              status: false,
              message: "Transaction not found",
            })
          );
        }

        const data = await Transaction.update(
          {
            user_id,
            isPaid,
            roundTrip,
            oneWay,
          },
          { where: { id }, returning: true }
        );

        const result = {
          status: false,
          message: "Transaction updated successfully",
          data: data[1][0],
        };
        resolve(res.status(200).json(result));
      } catch (error) {
        next(error);
      }
    });
  },

  delete: async (req, res, next) => {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
      try {
        const exist = await Transaction.findOne({ where: { id } });

        if (!exist) {
          return resolve(
            res.status(400).json({
              status: false,
              message: "Transaction not found",
            })
          );
        }

        const data = await Transaction.destroy({ where: { id } });
        await DetailTransaction.destroy({ where: { transaction_id: id } });

        resolve(
          res.status(200).json({
            status: true,
            message: "Transaction deleted successfully",
          })
        );
      } catch (error) {
        next(error);
      }
    });
  },

  pdf1: async (req, res, next) => {
    const { payment_code } = req.params;

    const trans = await Transaction.findOne({
      where: { payment_code: payment_code },
    });
    if (!trans)
      return res
        .status(400)
        .json({ status: false, message: "payment code not found" });

    const detailtrans = await DetailTransaction.findOne({
      where: { transaction_id: trans.id },
    });
    const flight = await Flight.findOne({
      where: { id: detailtrans.flight_id },
    });
    const pass = await Passenger.findAll({
      where: { detail_transaction_id: detailtrans.id },
    });

    try {
      const browser = await puppeteer.launch({
        executablePath: CHROMIUM_PATH,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-extensions"],
      });

      // Create a new page
      const page = await browser.newPage();

      // const a = path.join(__dirname, '/../../views/', "tes.ejs")
      const html1 = await email1.getHtml1("report-template.ejs", {
        trans: trans,
        detailtrans: detailtrans,
        flight: flight,
        pass: pass,
      });

      //Get HTML content from HTML file
      await page.setContent(html1, { waitUntil: "domcontentloaded" });

      // To reflect CSS used for screens instead of print
      await page.emulateMediaType("screen");

      // Downlaod the PDF
      const pdf = await page.pdf({
        path: `ticket.pdf`,
        margin: { top: "100px", right: "50px", bottom: "50px", left: "50px" },
        printBackground: true,
        format: "A4",
      });

      const file = pdf.toString("base64");

      const up = await imagekit.upload({
        file,
        fileName: `ticket.pdf`,
      });

      const link = up.url;

      const buffer = qr.imageSync(link);

      const b = buffer.toString("base64");

      const html2 = await email1.getHtml1("report-template1.ejs", {
        trans: trans,
        detailtrans: detailtrans,
        flight: flight,
        pass: pass,
        barcode: b,
      });

      //Get HTML content from HTML file
      await page.setContent(html2, { waitUntil: "domcontentloaded" });

      // To reflect CSS used for screens instead of print
      await page.emulateMediaType("screen");

      // Downlaod the PDF
      const pdf1 = await page.pdf({
        path: `ticket.pdf`,
        margin: { top: "100px", right: "50px", bottom: "50px", left: "50px" },
        printBackground: true,
        format: "A4",
      });

      const file1 = pdf1.toString("base64");

      const up1 = await imagekit.upload({
        file: file1,
        fileName: `ticket.pdf`,
      });

      const link1 = up1.url;

      const buffer1 = qr.imageSync(link1);

      const b1 = buffer1.toString("base64");
      // Close the browser instance
      await browser.close();

      const uploadedFile1 = Ticket.create({
        detail_transaction_id: pass[0].detail_transaction_id,
        ticket_pdf: link1,
        qr_code: b1,
      });

      const html3 = await email1.getHtml("email/payment.ejs", {
        trans: trans,
        detailtrans: detailtrans,
        flight: flight,
        pass: pass,
        link1
      });

      const user = req.user;
      let today = new Date().toLocaleDateString(["ban", "id"]);

      const response = await email1.sendEmail(
        `${user.email}`,
        "Your Order Confirmation On Terbang Tinggi Website Successful, Date : " +
          today,
        `${html3}`
      );

      return res.status(200).json({
        status: true,
        message: "success",
        url: link1,
        buffer: b1,
      });
    } catch (err) {
      next(err);
    }
  },

  //get history transaksi user
  getHistoryTransactionById: async (req, res, next) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { id } = req.params;
        const exist = await Transaction.findOne({
          where: { id },
          include: [
            {
              model: DetailTransaction,
              as: "detail_transaction",
              attributes: {
                exclude: ["createdAt", "updatedAt"],
              },
              include: [
                {
                  model: Flight,
                  as: "flight",
                  attributes: {
                    exclude: ["createdAt", "updatedAt"],
                  },
                },
                {
                  model: Passenger,
                  as: "passenger",
                  attributes: {
                    exclude: ["createdAt", "updatedAt"],
                  },
                },
                {
                  model: Ticket,
                  as: "tiket",
                  attributes: {
                    exclude: ["createdAt", "updatedAt"],
                  },
                },
              ],
            },
          ],
          attributes: {
            exclude: [
              "id",
              "user_id",
              "createdAt",
              "updatedAt",
              "detail_transaction",
            ],
          },
        });

        if (!exist) {
          return resolve(
            res.status(400).json({
              status: false,
              message: "Data not found",
            })
          );
        }

        resolve(
          res.status(200).json({
            status: true,
            message: "Success get all transaction",
            data: exist,
          })
        );
      } catch (error) {
        next(error);
      }
    });
  },
};
