import asyncio
import socket
import re
import time
from typing import AsyncGenerator, Dict, Any, List, Optional
import httpx

from app.modules.base import BaseScannerModule, ProbeResult

COMMON_PORTS = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    123: "NTP",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    465: "SMTPS",
    554: "RTSP",
    853: "DNS-over-TLS",
    993: "IMAPS",
    995: "POP3S",
    1433: "MSSQL",
    1521: "Oracle",
    1883: "MQTT",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5900: "VNC",
    6379: "Redis",
    8000: "HTTP-Alt",
    8080: "HTTP-Proxy",
    8443: "HTTPS-Alt",
    8888: "HTTP-Alt",
    9200: "Elasticsearch",
    27017: "MongoDB",
}

class ExposureScanner(BaseScannerModule):
    """Host and infrastructure exposure scanner powered by Shodan InternetDB."""

    def __init__(self):
        self.client_headers = {
            "User-Agent": "Mozilla/5.0 (compatible; TotallySpiesOSINT/1.0; +https://totallyspies.woohp)",
            "Accept": "application/json"
        }

    @property
    def name(self) -> str:
        return "exposure"

    @property
    def description(self) -> str:
        return "Host and infrastructure asset reconnaissance powered by Shodan InternetDB."

    def _resolve_target(self, target: str) -> Optional[str]:
        """Resolves target hostname to IPv4 address."""
        clean_target = target.strip().lower()
        # Remove scheme if present
        clean_target = re.sub(r"^https?://", "", clean_target).split("/")[0].split(":")[0]

        # Check if already IPv4
        ipv4_regex = r"^(\d{1,3}\.){3}\d{1,3}$"
        if re.match(ipv4_regex, clean_target):
            return clean_target

        try:
            resolved_ip = socket.gethostbyname(clean_target)
            return resolved_ip
        except Exception:
            return None

    async def lookup_host(self, target: str) -> Dict[str, Any]:
        """Queries Shodan InternetDB for complete host profile."""
        resolved_ip = self._resolve_target(target)
        if not resolved_ip:
            return {
                "query": target,
                "ip": None,
                "error": f"Unable to resolve host or invalid IP address: '{target}'",
                "ports": [],
                "hostnames": [],
                "cpes": [],
                "vulns": [],
                "tags": []
            }

        url = f"https://internetdb.shodan.io/{resolved_ip}"
        async with httpx.AsyncClient(headers=self.client_headers, timeout=10.0) as client:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    ports = data.get("ports", [])
                    enriched_ports = [
                        {
                            "port": p,
                            "service": COMMON_PORTS.get(p, "Unknown"),
                            "protocol": "tcp",
                        }
                        for p in sorted(ports)
                    ]
                    return {
                        "query": target,
                        "ip": resolved_ip,
                        "ports": enriched_ports,
                        "raw_ports": ports,
                        "hostnames": data.get("hostnames", []),
                        "cpes": data.get("cpes", []),
                        "vulns": data.get("vulns", []),
                        "tags": data.get("tags", []),
                        "source": "shodan_internetdb",
                        "status": "success"
                    }
                elif resp.status_code == 404:
                    return {
                        "query": target,
                        "ip": resolved_ip,
                        "ports": [],
                        "raw_ports": [],
                        "hostnames": [],
                        "cpes": [],
                        "vulns": [],
                        "tags": [],
                        "source": "shodan_internetdb",
                        "status": "not_indexed",
                        "message": "Host not currently indexed in Shodan InternetDB."
                    }
                else:
                    return {
                        "query": target,
                        "ip": resolved_ip,
                        "error": f"Shodan InternetDB returned HTTP {resp.status_code}",
                        "ports": [],
                        "hostnames": [],
                        "cpes": [],
                        "vulns": [],
                        "tags": []
                    }
            except Exception as e:
                return {
                    "query": target,
                    "ip": resolved_ip,
                    "error": f"Failed to contact Shodan InternetDB: {str(e)}",
                    "ports": [],
                    "hostnames": [],
                    "cpes": [],
                    "vulns": [],
                    "tags": []
                }

    async def run(
        self,
        target_value: str,
        config: Dict[str, Any]
    ) -> AsyncGenerator[ProbeResult, None]:
        """Runs the Exposure scanner against target IP/domain and yields graph artifacts."""
        start_time = time.time()
        resolved_ip = self._resolve_target(target_value)

        if not resolved_ip:
            yield ProbeResult(
                platform="DNS Resolution",
                url=f"dns://{target_value}",
                is_match=False,
                error=f"Could not resolve '{target_value}' to an IPv4 address.",
                metadata={"category": "error", "engine": "dns"}
            )
            return

        # 1. Query Shodan InternetDB
        host_info = await self.lookup_host(resolved_ip)
        latency = round(time.time() - start_time, 2)

        # Emit resolved IP node if input was a domain
        if resolved_ip != target_value.strip().lower():
            yield ProbeResult(
                platform=f"IP: {resolved_ip}",
                url=f"http://{resolved_ip}",
                is_match=True,
                response_time=latency,
                metadata={
                    "ip": resolved_ip,
                    "domain": target_value,
                    "category": "host",
                    "engine": "dns"
                }
            )

        # 2. Emit Discovered Open Ports
        ports = host_info.get("ports", [])
        for port_info in ports:
            port_num = port_info["port"]
            service = port_info["service"]
            scheme = "https" if port_num in [443, 8443] else "http" if port_num in [80, 8080, 8000] else ""
            port_url = f"{scheme}://{resolved_ip}:{port_num}" if scheme else f"{resolved_ip}:{port_num}"

            yield ProbeResult(
                platform=f"Port {port_num} ({service})",
                url=port_url,
                is_match=True,
                response_time=latency,
                metadata={
                    "port": port_num,
                    "service": service,
                    "ip": resolved_ip,
                    "protocol": "tcp",
                    "category": "code",
                    "engine": "shodan_internetdb",
                    "confidence": 1.0,
                    "display_name": f"{service} on Port {port_num}",
                    "bio": f"Exposed network service detected via Shodan InternetDB on {resolved_ip}:{port_num}."
                }
            )

        # 3. Emit Associated Hostnames / Subdomains
        hostnames = host_info.get("hostnames", [])
        for host in hostnames:
            yield ProbeResult(
                platform=f"Host: {host}",
                url=f"https://{host}",
                is_match=True,
                response_time=latency,
                metadata={
                    "hostname": host,
                    "ip": resolved_ip,
                    "category": "other",
                    "engine": "shodan_internetdb",
                    "confidence": 1.0,
                    "display_name": host,
                    "bio": f"Associated reverse DNS hostname for {resolved_ip}."
                }
            )

        # 4. Emit Detected Vulnerabilities / CVEs
        vulns = host_info.get("vulns", [])
        for cve in vulns:
            yield ProbeResult(
                platform=f"CVE: {cve}",
                url=f"https://nvd.nist.gov/vuln/detail/{cve}",
                is_match=True,
                response_time=latency,
                metadata={
                    "cve": cve,
                    "ip": resolved_ip,
                    "category": "forum",
                    "engine": "shodan_internetdb",
                    "confidence": 1.0,
                    "display_name": cve,
                    "bio": f"Known security vulnerability associated with exposed software on {resolved_ip}."
                }
            )

        # 5. Emit Technology Tags
        cpes = host_info.get("cpes", [])
        for cpe in cpes:
            clean_cpe = cpe.replace("cpe:/a:", "").replace("cpe:/h:", "").replace("cpe:/o:", "")
            yield ProbeResult(
                platform=f"CPE: {clean_cpe}",
                url=f"https://nvd.nist.gov/products/cpe/search/results?naming_format=2.3&keyword={cpe}",
                is_match=True,
                response_time=latency,
                metadata={
                    "cpe": cpe,
                    "ip": resolved_ip,
                    "category": "social",
                    "engine": "shodan_internetdb",
                    "confidence": 1.0,
                    "display_name": clean_cpe,
                    "bio": f"Common Platform Enumeration (CPE) signature detected on {resolved_ip}."
                }
            )
