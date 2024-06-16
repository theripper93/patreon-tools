"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useState } from "react";
import {LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend} from "recharts";
import { useTheme } from "next-themes";

export default function Home() {
    const {setTheme} = useTheme("dark");
    const [insightsCSV, setInsightsCSV] = useState({ headers: [], data: [], chart: [] });
    const [insightsTableHeadersChecked, setInsightsTableHeadersChecked] = useState(["Your total earnings"]);
    const [detailedEarningsCSV, setDetailedEarningsCSV] = useState({ headers: [], data: [], chart: [] });
    //https://www.patreon.com/dashboard/creator-analytics-detailed-earnings.csv
    return (
        <main className='flex min-h-screen flex-col items-center justify-between p-24'>
            <div className='flex items-center space-x-2 flex-col gap-2'>
                <div className='grid grid-cols-2 items-center space-x-2 w-full'>
                    <Label>
                        Upload{" "}
                        <Link href='https://www.patreon.com/dashboard/creator-analytics-earnings.csv' target='_blank'>
                            Insights CSV file
                        </Link>
                    </Label>
                    <Input
                        type='file'
                        accept='.csv'
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    const csv = e.target.result;
                                    const lines = csv.split("\n");
                                    const headers = lines[0].split(",");
                                    const data = lines.slice(1).map((line) => line.split(","));
                                    const chart = data.map((row) => {
                                        const dataPoint = {};
                                        for (let i = 0; i < row.length; i++) {
                                            dataPoint[headers[i]] = parseFloat(row[i]);
                                        }
                                        return dataPoint;
                                    });
                                    setInsightsCSV({ headers, data, chart });
                                };
                                reader.readAsText(file);
                            }
                        }}
                    />
                </div>
                <div className='grid grid-cols-2 items-center space-x-2 w-full'>
                    <Label>
                        {" "}
                        Upload{" "}
                        <Link href='https://www.patreon.com/dashboard/creator-analytics-detailed-earnings.csv' target='_blank'>
                            Detailed Earnings CSV file
                        </Link>
                    </Label>
                    <Input
                        type='file'
                        accept='.csv'
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    const csv = e.target.result;
                                    const lines = csv.split("\n");
                                    const headers = lines[0].split(",");
                                    const data = lines.slice(1).map((line) => line.split(","));
                                    setDetailedEarningsCSV({ headers, data });
                                };
                                reader.readAsText(file);
                            }
                        }}
                    />
                </div>
            </div>

            {!!insightsCSV.chart.length && <LineChart id='insights' width={window.innerWidth*0.9} height={window.innerHeight*0.5} data={insightsCSV.chart} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>

                <XAxis dataKey='Month' />
                <YAxis />
                <Tooltip />
                <Legend />
                {insightsTableHeadersChecked.map((header) => (
                    <Line type='monotone' dataKey={header} key={header} stroke={stringToColour(header)} />
                ))}
            </LineChart>}

            <Table>
                <TableCaption>Insights</TableCaption>
                <TableHeader>
                    <TableRow>
                        {insightsCSV.headers.map((header) => (
                            <TableHead key={header}>
                                <div className='flex items-center space-x-2'>
                                    <Checkbox
                                        checked={insightsTableHeadersChecked.includes(header)}
                                        onCheckedChange={(checked) => {
                                            const newHeaders = [...insightsTableHeadersChecked];
                                            if (checked) {
                                                newHeaders.push(header);
                                            } else {
                                                newHeaders.splice(newHeaders.indexOf(header), 1);
                                            }
                                            setInsightsTableHeadersChecked(newHeaders);
                                        }}
                                    />

                                    <Label htmlFor={header}>{header}</Label>
                                </div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {insightsCSV.data.map((row) => (
                        <TableRow key={row.join()}>
                            {row.map((cell, index) => (
                                <TableCell key={index}>{cell}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </main>
    );
}

const stringToColour = (str) => {
    let hash = 0;
    str.split('').forEach(char => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash)
    })
    let colour = '#'
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff
      colour += value.toString(16).padStart(2, '0')
    }
    return colour
  }