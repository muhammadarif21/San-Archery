import React, { useState, useEffect } from 'react';
import { FiSearch, FiShoppingCart } from "react-icons/fi";
import { FaTrashCan } from "react-icons/fa6";
import rupiah from '@/utils/rupiahFormater';
import Swal from 'sweetalert2';

const NavBar = ({ setSearchTerm, searchTerm }) => {
    const [isSearch, setIsSearch] = useState(false);
    const [click, setClick] = useState(false);
    const [clickCart, setClickCart] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [ordered, setOrdered] = useState(JSON.parse(localStorage.getItem('orderedProduct')) || []);
    const [quantities, setQuantities] = useState([]);
    const [customerData, setCustomerData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        address: '',
        shippingOption: 'regular'
    });



    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js"
        const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY
        const script = document.createElement('script')
        script.src = snapScript
        script.setAttribute('data-client-key', clientKey)
        script.async = true

        document.body.appendChild(script)
        return () => {
            document.body.removeChild(script)
        }
    }, [])

    useEffect(() => {
        const handleStorageChange = () => {
            const cartList = JSON.parse(localStorage.getItem('orderedProduct')) || [];
            setOrdered(cartList);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('orderedProductUpdated', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('orderedProductUpdated', handleStorageChange);
        };
    }, []);

    useEffect(() => {
        setQuantities(ordered.map(item => ({ imageUrl: item.imageUrl, quantity: 1 })));
    }, [ordered]);

    const handleSearchClick = () => {
        setIsSearch(!isSearch);
        if (!isSearch) {
            setClickCart(false);
            scrollToSection('products')
        }
    };

    const handleCartClick = () => {
        setClickCart(!clickCart);
        if (!clickCart) {
            setIsSearch(false);
        }
    };

    const handleSearch = (event) => {
        const term = event.target.value;
        setSearchTerm(term);
    };

    const handleDelete = (imageUrl) => {
        const updatedOrdered = ordered.filter(item => item.imageUrl !== imageUrl);
        setOrdered(updatedOrdered);
        localStorage.setItem('orderedProduct', JSON.stringify(updatedOrdered));
        window.dispatchEvent(new Event('orderedProductUpdated'));
    };

    const handleQuantityChange = (imageUrl, delta) => {
        setQuantities(prevQuantities => {
            const updatedQuantities = prevQuantities.map(item => {
                if (item.imageUrl === imageUrl) {
                    const newQuantity = item.quantity + delta;
                    if (newQuantity < 1) {
                        const updatedOrdered = ordered.filter(orderItem => orderItem.imageUrl !== imageUrl);
                        setOrdered(updatedOrdered);
                        localStorage.setItem('orderedProduct', JSON.stringify(updatedOrdered));
                        return null;
                    }
                    return {
                        ...item,
                        quantity: newQuantity
                    };
                }
                return item;
            }).filter(item => item !== null);
            return updatedQuantities;
        });
    };

    const totalHarga = ordered.reduce((total, item) => {
        const quantity = quantities.find(q => q.imageUrl === item.imageUrl)?.quantity || 1;
        return total + item.price * quantity;
    }, 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCustomerData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customerData.name || !customerData.email || !customerData.phoneNumber || !customerData.address) {
            alert('Please fill in all customer details.');
            return;
        }

        let shippingCost = 0;
        if (customerData.shippingOption === 'regular') {
            shippingCost = 25000;
        } else if (customerData.shippingOption === 'prioritas') {
            shippingCost = 30000;
        }

        // Menghitung totalPrice untuk setiap item dan juga menghitung total keseluruhan  
        const cartItems = ordered.map(item => {
            const quantity = quantities.find(q => q.imageUrl === item.imageUrl)?.quantity || 1;
            return {
                product: item.name,
                price: item.price, // ✅ Tambahkan harga satuan
                quantity: quantity,
                totalPrice: item.price * quantity // ✅ Kirim harga total
            };
        });        

        // Buat payload untuk dikirim ke backend  
        const orderPayload = {
            customerData,
            cartItems
        };

        try {
            const response = await fetch(`http://localhost:5000/create-transaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${import.meta.env.MIDTRANS_SERVER_KEY}:`
                },
                body: JSON.stringify(orderPayload)
            });


            const data = await response.json();

            if (data.token) {
                const token = data.token;
                // Panggil Midtrans Snap untuk menampilkan pop-up QRIS
                window.snap.pay(token, {
                    onSuccess: async function (result) {
                        Swal.fire({
                            title: "Pesanan Berhasil!",
                            text: "Terima kasih telah melakukan pemabayaran",
                            icon: "success",
                            confirmButtonText: 'OK'
                        }).then(() => {
                            localStorage.removeItem("orderedProduct");
                            window.location.reload();
                        });
                    },
                    onPending: function (result) {
                        console.log('Pending:', result);
                        Swal.fire({
                            title: "Pesanan dalam proses!",
                            text: "Silakan selesaikan pembayaran anda.",
                            icon: "info"
                        });
                    }
                });
            } else {
                Swal.fire({
                    title: "Error!",
                    text: "Failed to create transaction.",
                    icon: "error"
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                title: "Error!",
                text: `Failed to place order: ${error.message}`,
                icon: "error"
            });
        }
    };

    const scrollToSection = (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            <div className={`flex w-full justify-between md:justify-evenly items-center h-16 md:h-28 bg-black top-0 p-4 z-50 ${isScrolled ? 'opacity-80' : 'opacity-100'}`}>
                <div className=' w-full md:px-20 flex pt-2 justify-evenly md:justify-between'>
                    <div className='h-full lg:mt-4 font-bold italic'>
                        <h2 className="md:text-5xl text-white flex flex-row">
                            San <span className='text-[#bf8347] ml-2'>Archery</span>
                        </h2>
                    </div>
                    <ul className={`lg:flex gap-3 lg:mt-4 justify-center text-xl text-white bg-black  ${click ? 'flex flex-col absolute w-full p-4' : 'hidden'}`}>
                        <li className='navlink w-full my-2 lg:w-36 h-10 hover:text-[#bf8347]' onClick={() => scrollToSection('home')}>Home</li>
                        <li className='navlink w-full my-2 lg:w-36 h-10 hover:text-[#bf8347]' onClick={() => scrollToSection('about')}>About Us</li>
                        <li className='navlink w-full my-2 lg:w-40 h-10 hover:text-[#bf8347]' onClick={() => scrollToSection('products')}>Buy Products</li>
                        <li className='navlink w-full my-2 lg:w-40 h-10 hover:text-[#bf8347]' onClick={() => scrollToSection('contact')}>Contact Us</li>
                    </ul>

                    <div className='h-full lg:mt-7 flex justify-center items-center gap-3 text-2xl md:text-4xl cursor-pointer relative'>
                        <FiSearch
                            className={!isSearch ? 'text-white hover:text-[#bf8347]' : 'text-[#bf8347]'}
                            onClick={handleSearchClick}
                        />
                        <div onClick={handleCartClick} className="relative">
                            <div className='dot-notification absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center text-sm'>{ordered.length}</div>
                            <FiShoppingCart
                                className={!clickCart ? 'text-white hover:text-[#bf8347]' : 'text-[#bf8347]'}
                            />
                        </div>
                        <div onClick={() => setClick(!click)} className="lg:hidden opacity-95 sticky w-20 md:w-10 flex items-center justify-end">
                            <div className={`flex flex-col gap-2 ${click ? 'absolute' : 'top-0 md:top-6'}`}>
                                <div className={`${click && 'rotate-45 duration-300'} menubar w-6`}></div>
                                <div className={`${click && 'hidden'} menubar w-9`}></div>
                                <div className={`${click && '-rotate-45 duration-300'} menubar w-6`}></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <div className='flex justify-end mr-4 md:mr-48'>
                <input
                    type='search'
                    value={searchTerm}
                    onChange={handleSearch}
                    className={!isSearch ? 'hidden' : 'w-full md:w-[54%] border h-24 p-4 outline-none z-50'}
                    placeholder='Search product here'
                />
            </div>
            {clickCart && (
                <div className='cart-dropdown fixed md:top-28 right-0 md:w-1/3 h-full max-h-[calc(100vh-7rem)] w-full bg-white p-4 shadow-lg z-50 overflow-y-auto'>
                    <h3 className='text-xl text-center font-bold '>
                        {ordered.length === 0
                            ? "Cart is Empty"
                            : (
                                <div className='flex flex-col gap-3'>
                                    {ordered.map((list, index) => {
                                        const quantity = quantities.find(q => q.imageUrl === list.imageUrl)?.quantity || 1;
                                        const totalItemPrice = list.price * quantity;
                                        return (
                                            <div key={index} className='flex flex-col gap-2'>
                                                <h3 className='text-center'>{list.name}</h3>
                                                <div className='w-full h-20 flex flex-row'>
                                                    <img src={list.imageUrl} alt={list.name} className='w-[20%] h-full' />
                                                    <div className='flex flex-row w-full justify-center'>
                                                        <div className='flex w-full justify-evenly'>
                                                            <div>
                                                                <button onClick={() => handleQuantityChange(list.imageUrl, -1)} className='bg-gray-300 p-1 w-6 rounded-sm'>-</button>
                                                                <span className='mx-2'>{quantity}</span>
                                                                <button onClick={() => handleQuantityChange(list.imageUrl, 1)} className='bg-gray-300 p-1 h-8 rounded-sm'>+</button>
                                                            </div>
                                                            <p> = {rupiah(totalItemPrice)}</p>

                                                            <FaTrashCan className=' cursor-pointer flex justify-end' onClick={() => handleDelete(list.imageUrl)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className='mt-4'>
                                        <h3 className='text-center font-bold'>Total: {rupiah(totalHarga)}</h3>
                                    </div>
                                    <div className='mt-4'>
                                        <h3 className='text-xl font-bold'>Customer Detail</h3>
                                        <form className='flex flex-col gap-2' onSubmit={handleSubmit}>
                                            <input type='text' name='name' placeholder='Name' className='border p-2' value={customerData.name} onChange={handleInputChange} />
                                            <input type='email' name='email' placeholder='Email' className='border p-2' value={customerData.email} onChange={handleInputChange} />
                                            <input type='number' name='phoneNumber' placeholder='Phone' className='border p-2' value={customerData.phoneNumber} onChange={handleInputChange} />
                                            <input type='text' name='address' placeholder='Address' className='border p-2' value={customerData.address} onChange={handleInputChange} />
                                            <label className=' flex flex-col'>
                                                Pilih opsi pengiriman
                                                <select name='shippingOption' className=' mt-3' value={customerData.shippingOption} onChange={handleInputChange}>
                                                    <option value='regular'>Regular</option>
                                                    <option value='prioritas'>Prioritas</option>
                                                </select>
                                            </label>
                                            <button type='submit' className='bg-blue-500 text-white p-2 mt-2'>Checkout</button>
                                        </form>
                                    </div>
                                </div>
                            )
                        }
                    </h3>
                </div>
            )}
        </>
    );
};

export default NavBar;