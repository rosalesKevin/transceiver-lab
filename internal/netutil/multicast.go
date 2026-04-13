package netutil

import (
	"fmt"
	"net"

	"golang.org/x/net/ipv4"
)

// JoinMulticast joins a multicast group for receiving.
func JoinMulticast(ifaceName, group string, port int) (*net.UDPConn, error) {
	iface, err := FindInterface(ifaceName)
	if err != nil {
		return nil, err
	}
	addr := &net.UDPAddr{IP: net.ParseIP(group), Port: port}
	conn, err := net.ListenMulticastUDP("udp4", iface, addr)
	if err != nil {
		return nil, fmt.Errorf("join multicast %s:%d on %s: %w", group, port, iface.Name, err)
	}
	conn.SetReadBuffer(1024 * 1024) // 1MB
	return conn, nil
}

// DialMulticast creates a UDP conn for sending to a multicast group.
func DialMulticast(ifaceName, group string, port, ttl int, loopback bool) (*net.UDPConn, error) {
	iface, err := FindInterface(ifaceName)
	if err != nil {
		return nil, err
	}

	localAddr := &net.UDPAddr{IP: net.IPv4zero, Port: 0}
	conn, err := net.ListenUDP("udp4", localAddr)
	if err != nil {
		return nil, fmt.Errorf("listen udp for send: %w", err)
	}

	p := ipv4.NewPacketConn(conn)
	// Best-effort socket options — may fail on some platforms/interfaces
	_ = p.SetMulticastTTL(ttl)
	_ = p.SetMulticastLoopback(loopback)
	_ = p.SetMulticastInterface(iface)

	return conn, nil
}

// SendTo sends bytes to a multicast address.
func SendTo(conn *net.UDPConn, data []byte, group string, port int) (int, error) {
	dest := &net.UDPAddr{IP: net.ParseIP(group), Port: port}
	return conn.WriteToUDP(data, dest)
}
