"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Page(){const router=useRouter();useEffect(()=>{router.replace("/dashboard/admin/fightpassport-beheer")},[router]);return <main style={{padding:24}}>Doorsturen naar FightPaspoort Beheer...</main>}
