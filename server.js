import express from 'express';
import midtransClient from 'midtrans-client';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client, Databases, ID } from 'appwrite';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

// Endpoint untuk membuat transaksi Midtrans
app.post('/create-transaction', async (req, res) => {
    const { customerData, cartItems } = req.body;

    // Buat instance Midtrans Snap
    let snap = new midtransClient.Snap({
        isProduction: false,
        serverKey: process.env.VITE_MIDTRANS_SERVER_KEY,
        clientKey: process.env.VITE_MIDTRANS_CLIENT_KEY
    });

    // Buat parameter transaksi
    let totalItemAmount = cartItems.reduce((acc, item) => {
        return acc + (item.totalPrice * item.quantity);
    }, 0);

    let parameter = {
        transaction_details: {
            order_id: `order-${Date.now()}`,
            gross_amount: totalItemAmount
        },
        customer_details: {
            first_name: customerData.name,
            email: customerData.email,
            phone: customerData.phoneNumber,
            address: customerData.address
        },
        item_details: cartItems.map(item => ({
            id: item.product,
            price: item.totalPrice,
            quantity: item.quantity,
            name: item.product
        }))
    };
    const client = new Client();

    client
        .setEndpoint(process.env.VITE_ENDPOINT)
        .setProject(process.env.VITE_PROJECT_ID);


    const databases = new Databases(client)

    async function saveOrder(customerData, cartItems) {
        try {
            console.log('Saving order with customerData:', customerData);
            console.log('Saving order with cartItems:', cartItems);

            // Simpan data customer
            const customer = await databases.createDocument(
                process.env.VITE_DATABASE_ID,
                process.env.VITE_COLLECTION_ID_CUSTOMER,
                ID.unique(),
                {
                    name: customerData.name,
                    email: customerData.email,
                    phoneNumber: customerData.phoneNumber,
                    address: customerData.address,
                    shippingOption: customerData.shippingOption
                }
            );


            // Simpan data pesanan
            for (const item of cartItems) {
                try {
                    const order = await databases.createDocument(
                        process.env.VITE_DATABASE_ID,
                        process.env.VITE_COLLECTION_ID_ORDER, // Ganti dengan ID koleksi OrderedList Anda
                        ID.unique(),
                        {
                            customer: customer.$id, // Menyimpan ID customer sebagai creator
                            product: item.product,
                            quantity: item.quantity,
                            totalPrice: item.totalPrice
                        }
                    );
                    console.log(order, "ini ordernya");
                } catch (orderError) {
                    console.error('Error saving order item:', orderError);
                }
            }

            console.log('Order saved successfully');
        } catch (error) {
            console.error('Error saving order:', error);
            throw error;
        }
    }

    try {
        const transaction = await snap.createTransaction(parameter);

        await saveOrder(customerData, cartItems, transaction.token);
        res.json({ token: transaction.token });
    } catch (error) {
        console.log(error, "ini error");
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});