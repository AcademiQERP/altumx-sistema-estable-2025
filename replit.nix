{pkgs}: {
  deps = [
    pkgs.lsof
    pkgs.procps
    pkgs.netcat-openbsd
    pkgs.jq
    pkgs.postgresql
  ];
}
