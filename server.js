import express from 'express';
import midtransClient from 'midtrans-client';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client, Databases, ID } from 'appwrite';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

// ✅ Inisialisasi Appwrite Client
const client = new Client();
client
    .setEndpoint(process.env.VITE_ENDPOINT)
    .setProject(process.env.VITE_PROJECT_ID);

const databases = new Databases(client);
console.log("✅ Appwrite Client Initialized");

// ================================
// 🚀 Endpoint untuk membuat transaksi Midtrans
// ================================
app.post('/create-transaction', async (req, res) => {
    try {
        const { customerData, cartItems } = req.body;

        console.log("📦 Received customerData:", customerData);
        console.log("🛍️ Received cartItems:", cartItems);

        if (!customerData || !cartItems || cartItems.length === 0) {
            console.error("❌ Missing customerData or cartItems");
            return res.status(400).json({ error: "Invalid request data" });
        }

        let snap = new midtransClient.Snap({
            isProduction: false,
            serverKey: process.env.VITE_MIDTRANS_SERVER_KEY, 
            clientKey: process.env.VITE_MIDTRANS_CLIENT_KEY
        });

        let totalItemAmount = cartItems.reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
        if (totalItemAmount <= 0) {
            console.error("❌ Error: totalItemAmount is invalid:", totalItemAmount);
            return res.status(400).json({ error: "Invalid total amount" });
        }

        let shippingCost = customerData.shippingOption === 'regular' ? 15000 : 25000;
        let totalAmount = totalItemAmount + shippingCost;

        let itemDetails = cartItems.map(item => ({
            id: item.product,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            name: item.product
        }));

        itemDetails.push({
            id: 'shipping',
            price: shippingCost,
            quantity: 1,
            name: `Shipping (${customerData.shippingOption})`
        });

        let order_id = `order-${Date.now()}`;

        let parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: totalAmount
            },
            customer_details: {
                first_name: customerData.name,
                email: customerData.email,
                phone: customerData.phoneNumber,
                address: customerData.address,
            },
            item_details: itemDetails
        };

        console.log("📜 Final Order Data:", JSON.stringify(parameter, null, 2));

        const transaction = await snap.createTransaction(parameter);
        console.log("✅ Transaction created successfully:", transaction);

        // ✅ Panggil `saveOrder()` sebelum mengirim respons
        await saveOrder(customerData, cartItems, order_id);

        // ✅ Kirim respons setelah data tersimpan
        res.json({ token: transaction.token, param: parameter });

    } catch (error) {
        console.error("❌ Midtrans Transaction Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

// ================================
// 🚀 Fungsi untuk menyimpan data ke Appwrite
// ================================
async function saveOrder(customerData, cartItems, transaction_id) {
    try {
        console.log('💾 Saving order with customerData:', customerData);
        console.log('🛒 Saving order with cartItems:', cartItems);

        // ✅ Simpan data customer ke Appwrite
        const customer = await databases.createDocument(
            process.env.VITE_DATABASE_ID,
            process.env.VITE_COLLECTION_ID_CUSTOMER,
            ID.unique(),
            {
                name: customerData.name,
                email: customerData.email,
                phoneNumber: customerData.phoneNumber,
                address: customerData.address,
                shippingOption: customerData.shippingOption,
                transaction_id: transaction_id,
                hasPaid: false  // Tambahkan default status pembayaran
            },
            { 
                'X-Appwrite-Key': process.env.VITE_SECRET_KEY  // ✅ API Key digunakan di headers
            }
        );

        console.log("✅ Customer saved successfully:", customer);

        // ✅ Simpan data pesanan ke Appwrite
        for (const item of cartItems) {
            try {
                const order = await databases.createDocument(
                    process.env.VITE_DATABASE_ID,
                    process.env.VITE_COLLECTION_ID_ORDER,
                    ID.unique(),
                    {
                        customer: customer.$id,
                        product: item.product,
                        quantity: item.quantity,
                        totalPrice: item.totalPrice
                    },
                    { 
                        'X-Appwrite-Key': process.env.VITE_SECRET_KEY  // ✅ API Key digunakan di headers
                    }
                );
                console.log("✅ Order saved successfully:", order);
            } catch (orderError) {
                console.error('❌ Error saving order item:', orderError.message);
            }
        }

        console.log('✅ Order process completed successfully');

    } catch (error) {
        console.error('❌ Error saving order:', error.response || error.message);
    }
}

// ================================
// 🚀 Jalankan server
// ================================
app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
