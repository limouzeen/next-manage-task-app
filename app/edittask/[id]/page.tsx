"use client";

import Image from "next/image";
import tasklogo from "./../../../assets/images/tasklogo.png";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ id: string }>();
  const taskId = params?.id; // อาจเป็น string

  const router = useRouter();

  // form state
  const [title, setTitle] = useState<string>("");
  const [detail, setDetail] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null); // <- rename ให้ชัดว่าเป็นไฟล์
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // URL (db หรือ blob)
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null);


  // โหลดข้อมูลเดิม
  useEffect(() => {
    if (!taskId) return;

    const fetchTaskById = async () => {
      const { data, error } = await supabase
        .from("task_tb")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error) {
        console.error(error);
        alert("พบปัญหาในการทำงาน ลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ");
        return;
      }

      setTitle(data?.title ?? "");
      setDetail(data?.detail ?? "");
      setIsCompleted(Boolean(data?.is_completed));
      setPreviewImage(data?.image_url ?? null);
      setOldImageUrl(data?.image_url ?? null);
    };

    fetchTaskById();
  }, [taskId]);

  // จัดการรูปภาพ
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file)); // blob url
    }
  };


  function extractPathFromPublicUrl(publicUrl: string): string | null {
  try {
    // ตัวอย่าง URL:
    // https://xxx.supabase.co/storage/v1/object/public/task_bk/1696255555-photo.jpg
    const u = new URL(publicUrl);
    const marker = "/storage/v1/object/public/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;

    const after = u.pathname.slice(i + marker.length); // "task_bk/1696...jpg"
    const parts = after.split("/");
    if (parts.length < 2) return null; // ต้องมี bucket + ชื่อไฟล์
    // parts[0] คือ bucket "task_bk" ที่เหลือคือ path จริงใน bucket
    return parts.slice(1).join("/"); // "1696...jpg"
  } catch {
    return null;
  }
}



  const handleUpdateTask = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  if (!taskId) return;

  const oldPublicUrl = oldImageUrl || "";     // <- URL เดิมจาก DB (ไม่ใช่ previewImage)
  let newPublicUrl = oldPublicUrl;
  let newFilePath: string | null = null;

  // 1) อัปโหลดไฟล์ใหม่ (ถ้ามี)
  if (imageFile) {
    const uploadPath = `${Date.now()}-${imageFile.name}`; // อัปที่ root bucket
    const { error: uploadError } = await supabase.storage
      .from("task_bk")
      .upload(uploadPath, imageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type || "image/*",
      });
    if (uploadError) { alert("อัปโหลดรูปไม่สำเร็จ"); return; }

    const { data: publicData } = supabase.storage
      .from("task_bk")
      .getPublicUrl(uploadPath);

    newPublicUrl = publicData.publicUrl;
    newFilePath = uploadPath;
  }

  // 2) อัปเดต DB
  const { error: updateError } = await supabase
    .from("task_tb")
    .update({
      title,
      detail,
      image_url: newPublicUrl,
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
  if (updateError) { alert("พบปัญหาในการทำงาน"); return; }

  // 3) ลบไฟล์เก่า (เฉพาะกรณีอัปโหลดใหม่จริง และ URL เก่าเป็น public URL)
  if (imageFile && oldPublicUrl && !oldPublicUrl.startsWith("blob:")) {
    const oldPath = extractPathFromPublicUrl(oldPublicUrl);
    if (oldPath && oldPath !== newFilePath) {
      const { error: deleteError } = await supabase.storage
        .from("task_bk")
        .remove([oldPath]);
      if (deleteError) console.warn("ลบรูปเก่าไม่สำเร็จ:", deleteError);
    }
  }

  alert("แก้ไขงานเรียบร้อย");
  router.push("/alltask");
};


  return (
    <div className="pt-20">
      <div className="flex flex-col items-center">
        <Image src={tasklogo} alt="tasklogo" width={100} height={100} />
        <h1 className="text-xl font-bold mt-5 mb-7">Manage Task App</h1>
      </div>

      <div className="max-w-3xl w-full border border-gray-500 p-10 mx-auto rounded-xl">
        <h1 className="text-xl font-bold text-center">🔃 แก้ไขงาน</h1>

        <form onSubmit={handleUpdateTask} className="w-full space-y-4">
          <div>
            <label className="block mb-1">ชื่องาน</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              type="text"
              className="w-full border rounded-lg p-2"
              required
            />
          </div>

          <div>
            <label className="block mb-1">รายละเอียด</label>
            <textarea
              value={detail}
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
            <label
              htmlFor="fileInput"
              className="inline-block cursor-pointer text-white hover:bg-violet-600 px-4 py-2 rounded border bg-violet-400 text-center"
            >
              เลือกรูป
            </label>
          </div>

          {previewImage && (
            <div className="mt-2">
              {/* ใช้ <img> กับ blob URL เพื่อตัดคำเตือน/optimization */}
              <img
                src={previewImage}
                alt="Preview"
                className="w-36 h-36 object-cover rounded-md"
              />
            </div>
          )}

          <div>
            <label className="block mb-1">สถานะ</label>
            <select
              className="w-full border rounded-lg p-2 mb-2"
              value={isCompleted ? "1" : "0"}
              onChange={(e) => setIsCompleted(e.target.value === "1")}
            >
              <option value="0">❌ ยังไม่เสร็จ</option>
              <option value="1">✔️ เสร็จแล้ว</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="text-white hover:bg-violet-600 block px-4 py-2 rounded border bg-violet-400 text-center"
            >
              บันทึกแก้ไขงาน
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
