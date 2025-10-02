"use client";
import Image from "next/image";
import tasklogo from "./../../assets/images/tasklogo.png";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
export default function Page() {

  //สร้าง state เพื่อทำกับข้อมูลบนหน้าเพจ
  const[title, setTitle] = useState<string>('');
  const[detail, setDetail] = useState<string>('');
  const[image_url, setImageUrl] = useState<File | null>(null);
  const[is_completed, setIsCompleted] = useState<boolean>(false);
  const[previewImage, setPreviewImage] = useState<string | null>(null);
  const router = useRouter();


  //จัดการรรูปภาพ
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageUrl(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSaveTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    //อัพโหลดรูปภาพขึ้น supabase
    let imageUrl = "";

    if (image_url) {
      const newImgFileName = `${Date.now()}-${image_url.name}`;
      const { data, error } = await supabase.storage
        .from("task_bk")
        .upload(newImgFileName, image_url);
      if (error) {
        console.log(error);
        //อัพโหลดรูปไม่สำเร็จ
        alert("อัพโหลดรูปไม่สำเร็จ");
        return;
      } else {
        const {data} = supabase.storage.from("task_bk").getPublicUrl(newImgFileName);
        imageUrl = data.publicUrl;
      }
    }

    



    const { data, error } = await supabase
      .from("task_tb")
      .insert([
        {
          title: title,
          detail: detail,
          image_url: imageUrl,
          is_completed: is_completed,
        },
      ]);
    if (error) {
      console.log(error);
    } else {
      //กลับไปยังกน้าแสดงงานทั้งหมด
      alert("บันทึกข้อมูลเรียบร้อย");
      router.push("/alltask");
    }
  };

  return (
    <div className="pt-20">
      <div className="flex flex-col items-center">
        <Image src={tasklogo} alt="tasklogo" width={100} height={100} />
        <h1 className="text-xl font-bold mt-5 mb-7">Manage Task App</h1>
      </div>

      <div className="w-3xl border border-gray-500 p-10 mx-auto rounded-xl">
        <h1 className="text-xl font-bold text-center">➕ เพิ่มงานใหม่</h1>

        <form onSubmit={handleSaveTask} className="w-full space-y-4">
          <div>
            <label>ชื่องาน</label>
            <input
              onChange={(e) => setTitle(e.target.value)}
              type="text"
              className="w-full border rounded-lg p-2"
              required
            />
          </div>
          <div>
            <label>รายละเอียด</label>
            <textarea
              onChange={(e) => setDetail(e.target.value)}
              className="w-full border rounded-lg p-2"
              rows={5}
              required
            />
          </div>
            <div>
              <label className="block mb-1 font-medium">อัปโหลดรูป</label>
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="fileInput" className="inline-block cursor-pointer text-white hover:bg-violet-600 px-4 py-2 rounded border bg-violet-400 text-center">
                เลือกรูป
              </label>
            </div>
            {previewImage && (
              <div className="mt-2">
                <Image
                  src={previewImage}
                  alt="Preview"
                  width={150}
                  height={150}
                />
              </div>
            )}
            <div>
              <label>สถานะ</label>
              <select className="w-full border rounded-lg p-2 mb-2"
                      value={is_completed? "1" : "0"}
                      onChange={(e) => setIsCompleted(e.target.value === "1")}>
                <option value="0">❌ ยังไม่เสร็จ</option>
                <option value="1">✔️ เสร็จแล้ว</option>
              </select>
            </div>
            
            <div>
              <button type="submit" className="text-white hover:bg-violet-600 block px-4 py-2 rounded border bg-violet-400 text-center">
                บันทึกงานใหม่
              </button>
            
          </div>
        </form>
        <Link
        href="/alltask"
        className="text-violet-400 hover:text-violet-600 block px-4 py-2 rounded text-center mt-10"
      >
        กลับไปหน้าแสดงงานทั้งหมด
      </Link>
      </div>
    </div>
  );
}
