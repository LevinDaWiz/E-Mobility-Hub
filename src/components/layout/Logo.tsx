interface LogoProps {
  className?: string;
}

// Logo tạm vẽ bằng SVG theo mockup. Muốn dùng logo thật: đặt ảnh vào src/assets/ và đổi thành <img>.
import logo from "../../assets/logo.png";

export function Logo({ className = "h-10 w-auto" }: LogoProps) {
  return (
    <img
      src={logo}
      className={className}
      alt="Smart E-Mobility Hub"
    />
  );
}