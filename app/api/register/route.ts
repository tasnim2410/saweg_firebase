import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let fullName: string | undefined;
    let email: string | undefined;
    let phone: string | undefined;
    let city: string | undefined;
    let role: string | undefined;
    let userType: string | undefined;
    let carKind: string | undefined;
    let maxCharge: string | undefined;
    let maxChargeUnit: string | undefined;
    let placeOfBusiness: string | undefined;
    let trucksNeeded: string | undefined;
    let merchantCity: string | undefined;
    let shipperCity: string | undefined;
    let truckImage: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      fullName = (form.get('fullName') as string | null) ?? undefined;
      email = (form.get('email') as string | null) ?? undefined;
      phone = (form.get('phone') as string | null) ?? undefined;
      city = (form.get('city') as string | null) ?? undefined;
      role = (form.get('role') as string | null) ?? undefined;
      userType = (form.get('userType') as string | null) ?? undefined;
      carKind = (form.get('carKind') as string | null) ?? undefined;
      maxCharge = (form.get('maxCharge') as string | null) ?? undefined;
      maxChargeUnit = (form.get('maxChargeUnit') as string | null) ?? undefined;
      placeOfBusiness = (form.get('placeOfBusiness') as string | null) ?? undefined;
      trucksNeeded = (form.get('trucksNeeded') as string | null) ?? undefined;
      merchantCity = (form.get('merchantCity') as string | null) ?? undefined;
      shipperCity = (form.get('shipperCity') as string | null) ?? undefined;
      const file = form.get('truckImage');
      truckImage = file instanceof File ? file : null;
    } else {
      const body = await req.json();
      fullName = body?.fullName;
      email = body?.email;
      phone = body?.phone;
      city = body?.city;
      role = body?.role;
      userType = body?.userType;
      carKind = body?.carKind;
      maxCharge = body?.maxCharge;
      maxChargeUnit = body?.maxChargeUnit;
      placeOfBusiness = body?.placeOfBusiness;
      trucksNeeded = body?.trucksNeeded;
      merchantCity = body?.merchantCity;
      shipperCity = body?.shipperCity;
    }

    const effectiveRole = role ?? userType;

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const to = process.env.CONTACT_TO_EMAIL;
    if (!resendApiKey || !resendFrom || !to) throw new Error('Missing RESEND_API_KEY, RESEND_FROM_EMAIL, or CONTACT_TO_EMAIL');

    const resend = new Resend(resendApiKey);

    const text = `New pre-launch registration:\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nCity: ${shipperCity || merchantCity || city}\nRole: ${effectiveRole}${placeOfBusiness ? `\nPlace of business: ${placeOfBusiness}` : ''}${trucksNeeded ? `\nTrucks needed: ${trucksNeeded}` : ''}${carKind ? `\nCar kind: ${carKind}` : ''}${maxCharge ? `\nMax charge: ${maxCharge}${maxChargeUnit ? ` ${maxChargeUnit}` : ''}` : ''}`;

    const attachment = truckImage
      ? {
          filename: truckImage.name || 'truck-image',
          content: Buffer.from(await truckImage.arrayBuffer()).toString('base64'),
        }
      : null;

    await resend.emails.send({
      from: resendFrom,
      to,
      subject: `New registration: ${fullName}`,
      text,
      attachments: attachment ? [attachment] : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
