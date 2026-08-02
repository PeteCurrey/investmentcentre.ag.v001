import { NextResponse } from 'next/server';
export declare function POST(request: Request): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    error: any;
    details: unknown;
}> | NextResponse<{
    success: boolean;
    orderId: any;
    fillPrice: any;
    units: any;
    instrument: any;
    timestamp: any;
    raw: unknown;
}>>;
//# sourceMappingURL=route.d.ts.map