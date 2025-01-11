import React, { useEffect, useRef } from 'react';

const AboutUs = () => {
    const sectionRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            const section = sectionRef.current;
            const sectionRect = section.getBoundingClientRect();

            if (sectionRect.top >= 0 && sectionRect.bottom <= window.innerHeight) {
                section.classList.remove('hidden');
                section.classList.add('slide-in-left');
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            id="about"
            className="w-full h-screen flex flex-col justify-center items-center bg-black"
        >
            <h2 className="font-bold text-[#bf8347] text-3xl lg:text-5xl mb-10">
                Tentang
                <span className="ml-2 text-white">Kami</span>
            </h2>
            <div
                ref={sectionRef}
                className="w-[90%] lg:w-[800px] p-6 flex flex-col justify-center items-center text-center bg-gray-800 rounded-lg shadow-lg"
            >
                <h2 className="text-4xl mb-5 text-white font-bold">
                    Kenapa Memilih Produk Kami?
                </h2>
                <p className="text-white mb-4">
                    Di <span className="text-[#bf8347] font-semibold">[San Archery]</span>, kami berkomitmen untuk memberikan produk terbaik yang menggabungkan <span className="font-bold">kualitas</span>, <span className="font-bold">inovasi</span>, dan <span className="font-bold">harga terjangkau</span>. Berikut alasan mengapa kami adalah pilihan yang tepat untuk Anda:
                </p>
                <ul className="text-white mb-4 space-y-2">
                    <li className="text-lg">
                        ⭐ <span className="font-semibold"> Harga Terjangkau:</span> Kualitas tinggi tanpa harus menguras kantong.
                    </li>
                    <li className="text-lg">
                        ⭐ <span className="font-semibold">Cocok untuk Hobi dan Kompetisi:</span> Peralatan yang disesuaikan dengan kebutuhan Anda.
                    </li>
                    <li className="text-lg">
                        ⭐ <span className="font-semibold">Layanan Terpercaya:</span> Konsultasi gratis dan dukungan penuh untuk membantu Anda memilih peralatan terbaik.
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default AboutUs;
