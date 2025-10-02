"use client";

import Image from "next/image";
import tasklogo from "./../../assets/images/tasklogo.png";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// สร้างประเภทข้อมูลที่ล้อกับตารางที่เราจะทำงานด้วย เพื่อให้ง่ายต่อการเรียกใช้งาน
type Task = {
  id: string;
  created_at: string;
  title: string;
  detail: string;
  image_url: string;
  is_completed: boolean;
  updated_at: string;
};

export default function Page() {
  //สร้าง state เพื่อเก็บข้อมูลที่ดึงมาจาก  supabase เพื่อนำไปแสดงที่หน้าเพจ
  const [tasks, setTasks] = useState<Task[]>([]);

  //ดึงข้อมูลจาก supabase มากำหนดให้กับ state: tasks
  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("task_tb")
        .select(
          "id, created_at, title, detail, image_url, is_completed, updated_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
      } else {
        setTasks(data as Task[]);
      }
    };
    fetchTasks();
  }, []);


  function extractPathFromPublicUrl(publicUrl: string): string | null {
  try {
    // ตัวอย่าง: https://xxx.supabase.co/storage/v1/object/public/task_bk/1696255555-photo.jpg
    const u = new URL(publicUrl);
    const marker = "/storage/v1/object/public/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;

    const after = u.pathname.slice(i + marker.length); // "task_bk/1696...jpg"
    const parts = after.split("/");
    if (parts.length < 2) return null; // ต้องมี bucket + ชื่อไฟล์
    // parts[0] คือชื่อ bucket ("task_bk") ที่เหลือคือ path ภายใน bucket
    return parts.slice(1).join("/"); // เช่น "1696255555-photo.jpg" หรือ "tasks/xxx.jpg"
  } catch {
    return null;
  }
}


const handleDelete = async (id: string) => {
  if (!confirm("ต้องการลบรายการนี้หรือไม่")) return;

  // 1) หา task เดิมจาก state เพื่อนำ image_url ไปใช้ลบไฟล์
  const task = tasks.find(t => t.id === id);
  const oldUrl = task?.image_url || "";
  const oldPath = oldUrl && !oldUrl.startsWith("blob:") ? extractPathFromPublicUrl(oldUrl) : null;

  // 2) ลบแถวใน DB ก่อน (กันกรณีลบไฟล์สำเร็จแต่ DB ไม่ลบ)
  const { error: dbError } = await supabase
    .from("task_tb")
    .delete()
    .eq("id", id);

  if (dbError) {
    console.error(dbError);
    alert("ลบข้อมูลในฐานข้อมูลไม่สำเร็จ");
    return;
  }

  // 3) พยายามลบไฟล์เก่าใน storage (ถ้ามี path)
  if (oldPath) {
    const { error: deleteError } = await supabase.storage
      .from("task_bk")
      .remove([oldPath]);

    if (deleteError) {
      // ไม่บล็อกผู้ใช้ แค่แจ้งเตือน/บันทึก log
      console.warn("ลบไฟล์รูปเดิมไม่สำเร็จ:", deleteError);
    }
  }

  // 4) อัปเดต state ให้หายจากตาราง
  setTasks(prev => prev.filter((t) => t.id !== id));
};


  return (
    <div className="p-20">
      <div className="flex flex-col items-center">
        <Image src={tasklogo} alt="tasklogo" width={100} height={100} />
        <h1 className="text-xl font-bold mt-5 mb-7">Manage Task App</h1>
      </div>

      <div className="flex flex-row-reverse">
        <Link
          href="/addtask"
          className="text-white hover:bg-violet-600 block px-4 py-2 rounded border bg-violet-400 text-center"
        >
          เพิ่มงาน
        </Link>
      </div>

      {/* -----ดึงข้อมูลแสดงในรูปแบบของตาราง----- */}
      <div className="mt-5 mb-5">
        <table className="min-w-full border border-grat-700 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">รูป</th>
              <th className="border p-2">Title</th>
              <th className="border p-2">Detail</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">วันที่เพิ่ม</th>
              <th className="border p-2">วันที่แก้ไข</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {/* วนลูป state: task ซึ่งเป็น Array */}

            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="border p-2">
                  {task.image_url ? (
                    <Image
                    className="mx-auto w-12 h-12 object-cover rounded"
                      src={task.image_url}
                      alt="tasklogo"
                      width={50}
                      height={50}
                    />
                  ) : (
                    <span className="text-gray-400 italic">ไม่มีรูป</span>
                  )}
                </td>
                <td className="border p-2">{task.title}</td>
                <td className="border p-2">{task.detail}</td>
                <td className="border p-2 text-center">
                  {task.is_completed ? "Completed" : "Not Completed"}
                </td>
                <td className="border p-2 text-center">{task.created_at}</td>
                <td className="border p-2 text-center">{task.updated_at}</td>
                <td className="border p-2 text-center">
                  <Link
                    href={`/edittask/${task.id}`}
                    className="text-violet-500 hover:text-violet-700 underline px-2 text-center"
                  >
                    แก้ไข
                  </Link>

                  <button onClick={() => handleDelete(task.id)} className="text-red-500 hover:text-red-700 underline cursor-pointer px-2">
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ------------------------------------*/}

      <Link
        href="/"
        className="text-violet-400 hover:text-violet-600 block px-4 py-2 rounded text-center mt-10"
      >
        กลับไปหน้าแรก
      </Link>
    </div>
  );
}
